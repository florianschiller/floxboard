package de.einfloh.floxboard.ai.domain

import jakarta.enterprise.context.ApplicationScoped
import jakarta.inject.Inject
import org.eclipse.microprofile.config.inject.ConfigProperty
import org.jboss.logging.Logger

@ApplicationScoped
class ShapeRetriever @Inject constructor(
    private val catalogIndex: ShapeCatalogIndex,
    @param:ConfigProperty(name = "floxboard.ai.retrieval.top-k", defaultValue = "15")
    private val defaultTopK: Int
) {

    private val log = Logger.getLogger(ShapeRetriever::class.java)

    /**
     * Retrieve the most relevant shape descriptors for a given prompt and category.
     */
    fun retrieveShapes(
        prompt: String,
        category: String? = null,
        topK: Int? = null
    ): List<ShapeDescriptor> {
        val scored = retrieveScoredShapes(prompt, category, topK)
        return scored.map { it.shape }
    }

    /**
     * Retrieve scored candidate shapes with diagnostic match details.
     */
    fun retrieveScoredShapes(
        prompt: String,
        category: String? = null,
        topK: Int? = null
    ): List<ScoredShape> {
        val limit = (topK ?: defaultTopK).coerceIn(3, 50)
        val trimmedPrompt = prompt.trim()
        val normalizedCategory = catalogIndex.normalizeCategory(category)

        val queryTokens = catalogIndex.tokenize(trimmedPrompt)
        val expandedTokens = catalogIndex.expandTokensWithSynonyms(queryTokens)
        val promptLower = trimmedPrompt.lowercase()

        // Get pool of candidate shapes
        val allDescriptors = catalogIndex.getAllDescriptors()
        val categoryShapes = if (normalizedCategory != "GENERAL") {
            catalogIndex.getDescriptorsByCategory(normalizedCategory)
        } else {
            emptyList()
        }

        val scoredMap = mutableMapOf<String, ScoredShape>()

        for (desc in allDescriptors) {
            val isMatchingCategory = desc.category.equals(normalizedCategory, ignoreCase = true)
            var score = 0.0
            val matchReasons = mutableListOf<String>()

            // 1. Direct name / shapeType in prompt
            val nameLower = desc.name.lowercase()
            val shapeTypeLower = desc.shapeType.lowercase()
            if (promptLower.contains(nameLower)) {
                score += 10.0
                matchReasons.add("Exact name match: '${desc.name}'")
            } else if (promptLower.contains(shapeTypeLower)) {
                score += 8.0
                matchReasons.add("Exact shapeType match: '${desc.shapeType}'")
            }

            // 2. Tag matches
            for (tag in desc.tags) {
                val tagLower = tag.lowercase()
                if (queryTokens.contains(tagLower)) {
                    score += 4.0
                    matchReasons.add("Direct tag match: '$tag'")
                } else if (expandedTokens.contains(tagLower)) {
                    score += 2.5
                    matchReasons.add("Synonym tag match: '$tag'")
                }
            }

            // 3. Description token matches
            val descTokens = catalogIndex.tokenize(desc.description)
            for (token in descTokens) {
                if (queryTokens.contains(token)) {
                    score += 1.5
                    matchReasons.add("Description token match: '$token'")
                } else if (expandedTokens.contains(token)) {
                    score += 0.8
                    matchReasons.add("Description synonym match: '$token'")
                }
            }

            // 4. Property definitions match
            desc.propertyDefinitions.forEach { prop ->
                val propName = prop.name.lowercase()
                if (queryTokens.contains(propName) || promptLower.contains(propName)) {
                    score += 2.0
                    matchReasons.add("Property match: '${prop.name}'")
                }
            }

            // 5. Category affinity boost
            if (isMatchingCategory && normalizedCategory != "GENERAL") {
                score += 3.0
                matchReasons.add("Category affinity ($normalizedCategory)")
            }

            // 6. Core fallback baseline
            if (desc.isCore) {
                score += 0.5
                matchReasons.add("Core fallback shape")
            }

            if (score > 0.0 || desc.isCore || isMatchingCategory) {
                scoredMap[desc.id] = ScoredShape(
                    shape = desc,
                    score = score,
                    matchReasons = matchReasons
                )
            }
        }

        // Rank by score descending
        val sortedScored = scoredMap.values.sortedWith(
            compareByDescending<ScoredShape> { it.score }
                .thenByDescending { it.shape.category.equals(normalizedCategory, ignoreCase = true) }
                .thenByDescending { it.shape.isCore }
                .thenBy { it.shape.name }
        )

        // Ensure key core shapes (Rectangle, Ellipse, Diamond, Cylinder) are included for completeness
        val selected = mutableListOf<ScoredShape>()
        val selectedIds = mutableSetOf<String>()

        for (scored in sortedScored) {
            if (selected.size < limit) {
                selected.add(scored)
                selectedIds.add(scored.shape.id)
            }
        }

        // If limit not full and we have core shapes missing, backfill core shapes
        if (selected.size < limit) {
            val coreDescriptors = catalogIndex.getCoreDescriptors()
            for (core in coreDescriptors) {
                if (selected.size >= limit) break
                if (!selectedIds.contains(core.id)) {
                    selected.add(ScoredShape(core, 0.5, listOf("Core shape fallback backfill")))
                    selectedIds.add(core.id)
                }
            }
        }

        // Fallback safety: if query relevance produced very few items (< 2 non-core), add category shapes
        if (selected.count { it.score > 1.0 } < 2 && categoryShapes.isNotEmpty()) {
            for (catShape in categoryShapes) {
                if (selected.size >= limit) break
                if (!selectedIds.contains(catShape.id)) {
                    selected.add(ScoredShape(catShape, 1.0, listOf("Category default fallback")))
                    selectedIds.add(catShape.id)
                }
            }
        }

        return selected
    }

    /**
     * Format the selected candidate shapes into a prompt guideline string for LLM injection.
     */
    fun formatCandidateShapesPrompt(shapes: List<ShapeDescriptor>): String {
        if (shapes.isEmpty()) return ""
        val allowedTypes = shapes.map { it.shapeType }.distinct().joinToString(" | ") { "\"$it\"" }
        val sb = StringBuilder()
        sb.append("Pre-selected Shape Catalog (Allowed shapeTypes: $allowedTypes):\n")
        for (shape in shapes) {
            sb.append(shape.toPromptGuideline()).append("\n")
        }
        return sb.toString().trim()
    }
}
