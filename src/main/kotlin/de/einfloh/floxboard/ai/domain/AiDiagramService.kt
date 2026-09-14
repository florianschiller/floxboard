package de.einfloh.floxboard.ai.domain

import de.einfloh.floxboard.ai.infrastructure.AiProviderPort
import de.einfloh.floxboard.license.domain.EntitlementService
import de.einfloh.floxboard.license.domain.UsageLedgerService
import de.einfloh.floxboard.whiteboard.domain.WhiteboardRepository
import de.einfloh.floxboard.whiteboard.domain.WhiteboardSnapshot
import de.einfloh.floxboard.whiteboard.domain.WhiteboardSnapshotRepository
import io.quarkus.narayana.jta.QuarkusTransaction
import jakarta.enterprise.context.ApplicationScoped
import jakarta.transaction.Transactional
import jakarta.ws.rs.BadRequestException
import java.util.*

@ApplicationScoped
class AiDiagramService(
    private val aiProvider: AiProviderPort,
    private val layoutEngine: DiagramLayoutEngine,
    private val entitlementService: EntitlementService,
    private val usageLedgerService: UsageLedgerService,
    private val whiteboardRepository: WhiteboardRepository,
    private val snapshotRepository: WhiteboardSnapshotRepository
) {

    fun estimateCredits(ownerId: UUID, request: AiCreditEstimateRequest): AiCreditEstimateResponse {
        val trimmedPrompt = request.prompt.trim()
        if (trimmedPrompt.isBlank()) {
            throw BadRequestException("Prompt cannot be empty")
        }

        // Estimate: Base 10 + (Prompt Length / 100) * 2 + Expected ~20 for shapes & connectors
        val estimatedCredits = 10L + (trimmedPrompt.length / 100L) * 2L + 20L
        val quotaStatus = entitlementService.checkQuota(ownerId, "ai:monthly_credits", estimatedCredits)

        return AiCreditEstimateResponse(
            estimatedCredits = estimatedCredits,
            remainingCredits = quotaStatus.remaining ?: 0L,
            isAllowed = quotaStatus.allowed
        )
    }

    fun getQuotaBalance(ownerId: UUID): AiQuotaBalanceResponse {
        val quotaStatus = entitlementService.checkQuota(ownerId, "ai:monthly_credits", 0L)
        return AiQuotaBalanceResponse(
            currentUsage = quotaStatus.current,
            limit = quotaStatus.limit,
            remaining = quotaStatus.remaining,
            isUnlimited = quotaStatus.limit == null
        )
    }

    @Transactional
    fun recordUsageAndSnapshot(
        ownerId: UUID,
        whiteboardId: UUID?,
        graphTitle: String?,
        prompt: String,
        category: String?,
        layoutResult: LayoutResult,
        actualCredits: Long
    ) {
        QuarkusTransaction.requiringNew().run {
            entitlementService.assertQuota(ownerId, "ai:monthly_credits", actualCredits)
            usageLedgerService.recordUsage(
                ownerId = ownerId,
                metricKey = "ai:monthly_credits",
                units = actualCredits,
                operation = "text_to_diagram",
                metadata = mapOf(
                    "prompt" to prompt.take(200),
                    "category" to (category ?: "GENERAL"),
                    "shapeCount" to layoutResult.shapeCount,
                    "connectorCount" to layoutResult.connectorCount
                )
            )

            if (whiteboardId != null) {
                val whiteboard = whiteboardRepository.findById(whiteboardId)
                if (whiteboard != null) {
                    val snapshot = WhiteboardSnapshot().apply {
                        this.whiteboardId = whiteboard.id!!
                        this.name = "AI: ${graphTitle ?: prompt.take(30)}"
                        this.description = "Generated from prompt: \"$prompt\""
                        this.isAutomatic = true
                        this.isGeneratedByAI = true
                        this.content = layoutResult.doc
                        this.createdBy = ownerId
                    }
                    snapshotRepository.persist(snapshot)
                    snapshotRepository.pruneAutoSnapshots(whiteboard.id!!)
                }
            }
        }
    }

    fun generateDiagram(ownerId: UUID, request: AiDiagramRequest): AiDiagramResponse {
        val prompt = request.prompt.trim()
        if (prompt.isBlank()) {
            throw BadRequestException("Prompt cannot be empty")
        }

        // Feature assertion
        entitlementService.assertFeature(ownerId, "ai:text_to_diagram")

        // 1. Quota Pre-Check: Base fee + prompt token estimate (non-transactional read)
        val minEstimate = 10L + (prompt.length / 100L) * 2L + 10L
        entitlementService.assertQuota(ownerId, "ai:monthly_credits", minEstimate)

        // 2. LLM Semantic Graph Extraction (external network call outside DB transaction)
        val graph = aiProvider.generateGraph(prompt, request.category, request.layoutDirection)

        // 3. Deterministic Spatial Layout Engine (pure computation)
        val layoutResult = layoutEngine.layout(graph, request.layoutDirection, request.theme)

        // 4. Dynamic Complexity Metering Formula
        val actualCredits = 10L + (prompt.length / 100L) * 2L + (layoutResult.shapeCount * 2L) + (layoutResult.connectorCount * 1L)

        // 5. Persist Quota Usage and Whiteboard Snapshot atomically
        recordUsageAndSnapshot(
            ownerId = ownerId,
            whiteboardId = request.whiteboardId,
            graphTitle = graph.title,
            prompt = prompt,
            category = request.category,
            layoutResult = layoutResult,
            actualCredits = actualCredits
        )

        val remainingStatus = entitlementService.checkQuota(ownerId, "ai:monthly_credits", 0L)

        return AiDiagramResponse(
            success = true,
            doc = layoutResult.doc,
            shapeCount = layoutResult.shapeCount,
            connectorCount = layoutResult.connectorCount,
            creditsConsumed = actualCredits,
            remainingCredits = remainingStatus.remaining ?: 0L,
            summary = graph.title ?: "Diagram synthesized successfully"
        )
    }
}
