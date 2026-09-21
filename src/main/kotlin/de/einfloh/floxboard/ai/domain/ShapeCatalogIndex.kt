package de.einfloh.floxboard.ai.domain

import com.fasterxml.jackson.databind.ObjectMapper
import de.einfloh.floxboard.whiteboard.domain.ShapeStencil
import jakarta.enterprise.context.ApplicationScoped
import jakarta.inject.Inject
import java.util.concurrent.ConcurrentHashMap

@ApplicationScoped
class ShapeCatalogIndex @Inject constructor(
    private val objectMapper: ObjectMapper
) {

    private val descriptorsById = ConcurrentHashMap<String, ShapeDescriptor>()
    private val descriptorsByCategory = ConcurrentHashMap<String, MutableSet<String>>()
    private val tokenIndex = ConcurrentHashMap<String, MutableSet<String>>()

    // Common synonyms and term expansions to enrich semantic recall
    private val synonymMap = mapOf(
        "db" to listOf("database", "sql", "storage", "datastore"),
        "sql" to listOf("database", "table", "relational"),
        "nosql" to listOf("database", "mongodb", "dynamodb", "document"),
        "k8s" to listOf("kubernetes", "cluster", "pod", "container", "microservice"),
        "kubernetes" to listOf("k8s", "cluster", "pod", "container", "microservice"),
        "s3" to listOf("storage", "bucket", "blob", "files"),
        "bucket" to listOf("s3", "storage", "blob", "files"),
        "kafka" to listOf("queue", "stream", "messaging", "pubsub", "broker", "event"),
        "rabbitmq" to listOf("queue", "messaging", "broker", "event"),
        "sqs" to listOf("queue", "messaging", "broker", "event"),
        "queue" to listOf("messaging", "broker", "stream", "kafka", "sqs", "rabbitmq", "buffer"),
        "lambda" to listOf("serverless", "function", "faas", "compute"),
        "serverless" to listOf("lambda", "function", "faas"),
        "rest" to listOf("api", "endpoint", "http", "service"),
        "gateway" to listOf("api", "ingress", "proxy", "router"),
        "auth" to listOf("user", "login", "sso", "security", "token", "session"),
        "user" to listOf("persona", "actor", "account", "profile"),
        "retro" to listOf("retrospective", "sticky", "notes", "agile", "feedback"),
        "sprint" to listOf("agile", "story", "scrum", "kanban", "backlog", "ticket"),
        "ticket" to listOf("story", "task", "jira", "agile", "card"),
        "decision" to listOf("gateway", "condition", "branch", "check", "diamond", "if"),
        "condition" to listOf("gateway", "decision", "branch", "diamond"),
        "event" to listOf("trigger", "start", "end", "signal", "timer"),
        "process" to listOf("workflow", "flowchart", "task", "activity", "bpmn"),
        "class" to listOf("uml", "entity", "object", "model", "schema"),
        "table" to listOf("database", "entity", "schema", "relational", "sql")
    )

    private val stopWords = setOf(
        "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are",
        "as", "at", "be", "because", "been", "before", "being", "below", "between", "both", "but",
        "by", "could", "did", "do", "does", "doing", "down", "during", "each", "few", "for", "from",
        "further", "had", "has", "have", "having", "he", "her", "here", "hers", "herself", "him",
        "himself", "his", "how", "i", "if", "in", "into", "is", "it", "its", "itself", "just", "me",
        "more", "most", "my", "myself", "no", "nor", "not", "of", "off", "on", "once", "only", "or",
        "other", "our", "ours", "ourselves", "out", "over", "own", "same", "should", "so", "some",
        "such", "than", "that", "the", "their", "theirs", "them", "themselves", "then", "there",
        "these", "they", "this", "those", "through", "to", "too", "under", "until", "up", "very",
        "was", "we", "were", "what", "when", "where", "which", "while", "who", "whom", "why", "with",
        "would", "you", "your", "yours", "yourself", "yourselves", "create", "make", "diagram", "draw",
        "generate", "please", "show", "build"
    )

    init {
        registerDefaultShapes()
    }

    fun getAllDescriptors(): List<ShapeDescriptor> = descriptorsById.values.toList()

    fun getDescriptor(id: String): ShapeDescriptor? = descriptorsById[id]

    fun getDescriptorsByCategory(category: String): List<ShapeDescriptor> {
        val normalized = normalizeCategory(category)
        val ids = descriptorsByCategory[normalized] ?: return emptyList()
        return ids.mapNotNull { descriptorsById[it] }
    }

    fun getCoreDescriptors(): List<ShapeDescriptor> =
        descriptorsById.values.filter { it.isCore }

    fun register(descriptor: ShapeDescriptor) {
        descriptorsById[descriptor.id] = descriptor

        val normalizedCategory = normalizeCategory(descriptor.category)
        descriptorsByCategory.computeIfAbsent(normalizedCategory) { ConcurrentHashMap.newKeySet() }.add(descriptor.id)

        // Index terms
        val tokens = extractSearchTokens(descriptor)
        for (token in tokens) {
            tokenIndex.computeIfAbsent(token) { ConcurrentHashMap.newKeySet() }.add(descriptor.id)
        }
    }

    fun registerAll(descriptors: Collection<ShapeDescriptor>) {
        descriptors.forEach { register(it) }
    }

    fun indexStencil(stencil: ShapeStencil): ShapeDescriptor {
        val tags = mutableListOf<String>()
        tags.addAll(tokenize(stencil.name))
        if (!stencil.description.isNullOrBlank()) {
            tags.addAll(tokenize(stencil.description!!))
        }

        var propertiesMap: Map<String, Any>? = null
        var shapeType = "Custom"
        var script: String? = null

        try {
            val tree = objectMapper.readTree(stencil.shapesJson)
            if (tree.isArray && tree.size() > 0) {
                val firstShape = tree.get(0)
                shapeType = firstShape.path("type").asText("Custom")
                if (firstShape.has("properties")) {
                    propertiesMap = objectMapper.convertValue(firstShape.get("properties"), Map::class.java) as? Map<String, Any>
                }
                if (firstShape.has("script")) {
                    script = firstShape.path("script").asText()
                }
            }
        } catch (_: Exception) {
            // fallback
        }

        val descriptor = ShapeDescriptor(
            id = "stencil-${stencil.id ?: stencil.name.lowercase().replace("\\s+".toRegex(), "-")}",
            name = stencil.name,
            shapeType = shapeType,
            category = stencil.category.name,
            description = stencil.description ?: "Custom stencil: ${stencil.name}",
            tags = tags.distinct(),
            properties = propertiesMap,
            script = script,
            isCore = false
        )
        register(descriptor)
        return descriptor
    }

    fun tokenize(text: String): List<String> {
        if (text.isBlank()) return emptyList()
        return text.lowercase()
            .replace("[^a-z0-9_\\-]".toRegex(), " ")
            .split("\\s+".toRegex())
            .map { it.trim() }
            .filter { it.length >= 2 && !stopWords.contains(it) }
    }

    fun expandTokensWithSynonyms(tokens: List<String>): Set<String> {
        val result = mutableSetOf<String>()
        for (token in tokens) {
            result.add(token)
            synonymMap[token]?.let { result.addAll(it) }
        }
        return result
    }

    fun normalizeCategory(category: String?): String {
        if (category.isNullOrBlank()) return "GENERAL"
        val upper = category.trim().uppercase()
        return when {
            upper.contains("UML") || upper.contains("CLASS") || upper.contains("SOFTWARE") -> "SOFTWARE_DESIGN_UML"
            upper.contains("AGILE") || upper.contains("SPRINT") || upper.contains("SCRUM") -> "AGILE_SPRINT"
            upper.contains("CLOUD") || upper.contains("ARCH") || upper.contains("AWS") || upper.contains("INFRA") -> "CLOUD_ARCHITECTURE"
            upper.contains("BPMN") || upper.contains("FLOW") || upper.contains("PROCESS") -> "FLOWCHART_BPMN"
            upper.contains("UI") || upper.contains("WIRE") -> "UI_WIREFRAMING"
            else -> upper
        }
    }

    private fun extractSearchTokens(descriptor: ShapeDescriptor): Set<String> {
        val tokens = mutableSetOf<String>()
        tokens.addAll(tokenize(descriptor.id))
        tokens.addAll(tokenize(descriptor.name))
        tokens.addAll(tokenize(descriptor.shapeType))
        tokens.addAll(tokenize(descriptor.category))
        tokens.addAll(tokenize(descriptor.description))
        for (tag in descriptor.tags) {
            tokens.addAll(tokenize(tag))
        }
        descriptor.properties?.keys?.forEach { key ->
            tokens.addAll(tokenize(key))
        }
        descriptor.propertyDefinitions.forEach { prop ->
            tokens.addAll(tokenize(prop.name))
            if (prop.description != null) {
                tokens.addAll(tokenize(prop.description))
            }
        }
        return tokens
    }

    fun findShapeIdsForToken(token: String): Set<String> =
        tokenIndex[token] ?: emptySet()

    private fun registerDefaultShapes() {
        val defaults = listOf(
            // Core Fallback Shapes
            ShapeDescriptor(
                id = "core-rectangle",
                name = "Rectangle Box",
                shapeType = "Rectangle",
                category = "GENERAL",
                description = "Standard rectangular box for generic nodes, entities, or functional components",
                tags = listOf("box", "rectangle", "node", "component", "block", "general", "default", "element"),
                isCore = true
            ),
            ShapeDescriptor(
                id = "core-ellipse",
                name = "Ellipse / Circle",
                shapeType = "Ellipse",
                category = "GENERAL",
                description = "Oval or circular shape representing start, end, states, or circular nodes",
                tags = listOf("circle", "ellipse", "oval", "round", "start", "end", "state", "event"),
                isCore = true
            ),
            ShapeDescriptor(
                id = "core-diamond",
                name = "Diamond / Rhombus",
                shapeType = "Diamond",
                category = "GENERAL",
                description = "Diamond shape for branching, conditions, gates, and decisions",
                tags = listOf("diamond", "rhombus", "decision", "condition", "branch", "gate", "if", "choice"),
                isCore = true
            ),
            ShapeDescriptor(
                id = "core-cylinder",
                name = "Cylinder Database",
                shapeType = "Cylinder",
                category = "GENERAL",
                description = "Cylinder representing persistent datastores, databases, or storage repositories",
                tags = listOf("cylinder", "database", "storage", "datastore", "data", "db", "sql", "repository"),
                properties = mapOf("title" to "Database", "subtitle" to "Data Store"),
                propertyDefinitions = listOf(
                    ShapePropertyDefinition("title", "string", "Main database or service name", "MainDB"),
                    ShapePropertyDefinition("subtitle", "string", "Engine or database type", "PostgreSQL")
                ),
                isCore = true
            ),
            ShapeDescriptor(
                id = "core-capsule",
                name = "Capsule / Pill",
                shapeType = "Capsule",
                category = "GENERAL",
                description = "Rounded pill/capsule shape for status badges, tags, or message queues",
                tags = listOf("capsule", "pill", "rounded", "status", "tag", "badge", "queue"),
                isCore = true
            ),
            ShapeDescriptor(
                id = "core-stickynote",
                name = "Sticky Note",
                shapeType = "StickyNote",
                category = "GENERAL",
                description = "Post-it style sticky note for annotations, retrospective items, brainstorms, or feedback",
                tags = listOf("stickynote", "sticky", "note", "memo", "postit", "retro", "annotation", "comment"),
                isCore = true
            ),
            ShapeDescriptor(
                id = "core-cloud",
                name = "Cloud Boundary",
                shapeType = "Cloud",
                category = "GENERAL",
                description = "Cloud shape for external services, Internet APIs, network boundaries, and SaaS endpoints",
                tags = listOf("cloud", "network", "internet", "external", "saas", "api", "thirdparty", "boundary"),
                isCore = true
            ),
            ShapeDescriptor(
                id = "core-queue",
                name = "Message Queue",
                shapeType = "Queue",
                category = "GENERAL",
                description = "Queue buffer shape for event streaming, message brokers, Kafka topics, and SQS queues",
                tags = listOf("queue", "buffer", "fifo", "stream", "kafka", "sqs", "rabbitmq", "pubsub", "messaging"),
                isCore = true
            ),

            // Software Design & UML Stencils
            ShapeDescriptor(
                id = "uml-class-box",
                name = "UML Class",
                shapeType = "UmlClass",
                category = "SOFTWARE_DESIGN_UML",
                description = "3-compartment UML class box with stereotype, className, attributes list, and methods list",
                tags = listOf("uml", "class", "entity", "domain", "object", "service", "repository", "model", "dto", "controller", "oop"),
                propertyDefinitions = listOf(
                    ShapePropertyDefinition("className", "string", "Name of the class", "UserAccount", required = true),
                    ShapePropertyDefinition("stereotype", "string", "UML stereotype", "<<Entity>>"),
                    ShapePropertyDefinition("attributes", "string[]", "Field definitions", listOf("- id: UUID", "- email: String")),
                    ShapePropertyDefinition("methods", "string[]", "Method definitions", listOf("+ save(): void", "+ findById(id: UUID): User"))
                )
            ),
            ShapeDescriptor(
                id = "uml-interface-box",
                name = "UML Interface",
                shapeType = "UmlClass",
                category = "SOFTWARE_DESIGN_UML",
                description = "UML interface contract box with stereotype <<Interface>>, method signatures, and contract specs",
                tags = listOf("uml", "interface", "contract", "api", "abstract", "trait", "protocol"),
                propertyDefinitions = listOf(
                    ShapePropertyDefinition("className", "string", "Name of interface", "UserRepository", required = true),
                    ShapePropertyDefinition("stereotype", "string", "Interface stereotype", "<<Interface>>"),
                    ShapePropertyDefinition("methods", "string[]", "Abstract methods", listOf("+ save(entity: T): T", "+ delete(id: UUID): void"))
                )
            ),
            ShapeDescriptor(
                id = "uml-database-table",
                name = "Database Table Schema",
                shapeType = "UmlClass",
                category = "SOFTWARE_DESIGN_UML",
                description = "Relational database table entity with primary keys, foreign keys, and column data types",
                tags = listOf("database", "table", "schema", "relational", "sql", "entity", "columns", "pk", "fk", "rdbms"),
                propertyDefinitions = listOf(
                    ShapePropertyDefinition("className", "string", "Table name", "users_tbl", required = true),
                    ShapePropertyDefinition("stereotype", "string", "Table stereotype", "<<Table>>"),
                    ShapePropertyDefinition("attributes", "string[]", "Columns and constraints", listOf("+ id: UUID [PK]", "- email: VARCHAR(255) [UNIQUE]", "- created_at: TIMESTAMP"))
                )
            ),

            // Agile & Sprint Stencils
            ShapeDescriptor(
                id = "agile-story-card",
                name = "User Story Card",
                shapeType = "AgileStoryCard",
                category = "AGILE_SPRINT",
                description = "Agile user story card with story code, title, persona, goal, value, story points, and status",
                tags = listOf("agile", "story", "user story", "jira", "sprint", "backlog", "epic", "ticket", "task", "scrum", "points", "persona"),
                propertyDefinitions = listOf(
                    ShapePropertyDefinition("code", "string", "Ticket key/code", "US-101"),
                    ShapePropertyDefinition("title", "string", "Story title", "SSO Login", required = true),
                    ShapePropertyDefinition("persona", "string", "Target role/persona", "As a User"),
                    ShapePropertyDefinition("goal", "string", "Desired action", "I want to log in with Google"),
                    ShapePropertyDefinition("value", "string", "Business value", "So that I can access boards quickly"),
                    ShapePropertyDefinition("points", "number", "Fibonacci story points", 5),
                    ShapePropertyDefinition("status", "string", "Workflow status", "IN_PROGRESS")
                )
            ),
            ShapeDescriptor(
                id = "agile-retro-card",
                name = "Agile Retro Sticky",
                shapeType = "StickyNote",
                category = "AGILE_SPRINT",
                description = "Retrospective feedback sticky note for sprint reviews, what went well, to improve, and action items",
                tags = listOf("agile", "retro", "retrospective", "review", "feedback", "went well", "improve", "action item", "sticky")
            ),

            // Cloud & Architecture Stencils
            ShapeDescriptor(
                id = "cloud-microservice",
                name = "Microservice / API Service",
                shapeType = "Rectangle",
                category = "CLOUD_ARCHITECTURE",
                description = "Microservice backend or container workload handling business logic and API requests",
                tags = listOf("microservice", "service", "backend", "api", "container", "docker", "pod", "kubernetes", "k8s", "app", "workload")
            ),
            ShapeDescriptor(
                id = "cloud-api-gateway",
                name = "API Gateway",
                shapeType = "Rectangle",
                category = "CLOUD_ARCHITECTURE",
                description = "API Gateway and reverse proxy handling TLS termination, rate limiting, routing, and authentication",
                tags = listOf("gateway", "api gateway", "ingress", "reverse proxy", "kong", "envoy", "router", "endpoint", "traffic")
            ),
            ShapeDescriptor(
                id = "cloud-serverless-lambda",
                name = "Serverless Function / Lambda",
                shapeType = "Capsule",
                category = "CLOUD_ARCHITECTURE",
                description = "Serverless compute function (AWS Lambda, Google Cloud Function) executing event-driven tasks",
                tags = listOf("lambda", "serverless", "function", "faas", "compute", "worker", "job", "event handler")
            ),
            ShapeDescriptor(
                id = "cloud-storage-bucket",
                name = "Object Storage / S3 Bucket",
                shapeType = "Cylinder",
                category = "CLOUD_ARCHITECTURE",
                description = "Object storage bucket for static assets, media, backups, and file storage (AWS S3, GCS, Blob)",
                tags = listOf("s3", "storage", "bucket", "blob", "object store", "gcs", "minio", "files", "media"),
                properties = mapOf("title" to "S3 Bucket", "subtitle" to "Object Store")
            ),
            ShapeDescriptor(
                id = "cloud-message-broker",
                name = "Message Broker / Event Stream",
                shapeType = "Queue",
                category = "CLOUD_ARCHITECTURE",
                description = "Distributed event streaming platform or message broker (Kafka, SQS, RabbitMQ, EventBridge)",
                tags = listOf("kafka", "sqs", "rabbitmq", "eventbridge", "queue", "stream", "messaging", "pubsub", "broker", "events")
            ),
            ShapeDescriptor(
                id = "cloud-external-saas",
                name = "External SaaS / Third-Party API",
                shapeType = "Cloud",
                category = "CLOUD_ARCHITECTURE",
                description = "External 3rd-party SaaS service, payment gateway, OAuth identity provider, or external cloud API",
                tags = listOf("external", "saas", "stripe", "auth0", "thirdparty", "cloud", "payment", "oauth", "webhook", "api")
            ),

            // BPMN & Process Flow Stencils
            ShapeDescriptor(
                id = "bpmn-exclusive-gateway",
                name = "BPMN Decision Gateway",
                shapeType = "BpmnGateway",
                category = "FLOWCHART_BPMN",
                description = "BPMN decision gateway (XOR / Exclusive / Parallel) for workflow branching and conditions",
                tags = listOf("bpmn", "gateway", "decision", "condition", "branch", "xor", "parallel", "fork", "choice", "if"),
                propertyDefinitions = listOf(
                    ShapePropertyDefinition("gatewayType", "string", "Gateway branch type (EXCLUSIVE, PARALLEL, INCLUSIVE)", "EXCLUSIVE"),
                    ShapePropertyDefinition("label", "string", "Decision criterion or condition question", "Approved?")
                )
            ),
            ShapeDescriptor(
                id = "bpmn-process-task",
                name = "BPMN Process Activity / Task",
                shapeType = "Rectangle",
                category = "FLOWCHART_BPMN",
                description = "BPMN process task or user action step in workflow execution",
                tags = listOf("bpmn", "task", "activity", "action", "step", "process", "operation", "work", "execute")
            ),
            ShapeDescriptor(
                id = "bpmn-event-node",
                name = "BPMN Start/End Event",
                shapeType = "Ellipse",
                category = "FLOWCHART_BPMN",
                description = "BPMN event node representing process start, intermediate trigger, timer, or completion end event",
                tags = listOf("bpmn", "event", "start", "end", "timer", "trigger", "message", "signal", "terminate", "stop")
            )
        )

        registerAll(defaults)
    }
}
