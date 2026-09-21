package de.einfloh.floxboard.ai.domain

import com.fasterxml.jackson.annotation.JsonIgnoreProperties
import com.fasterxml.jackson.annotation.JsonInclude

@JsonIgnoreProperties(ignoreUnknown = true)
@JsonInclude(JsonInclude.Include.NON_NULL)
data class ShapePropertyDefinition(
    val name: String,
    val type: String,
    val description: String? = null,
    val example: Any? = null,
    val required: Boolean = false
)

@JsonIgnoreProperties(ignoreUnknown = true)
@JsonInclude(JsonInclude.Include.NON_NULL)
data class ShapeDescriptor(
    val id: String,
    val name: String,
    val shapeType: String,
    val category: String, // e.g. "CLOUD_ARCHITECTURE", "SOFTWARE_DESIGN_UML", "AGILE_SPRINT", "FLOWCHART_BPMN", "GENERAL", "UI_WIREFRAMING"
    val description: String,
    val tags: List<String> = emptyList(),
    val properties: Map<String, Any>? = null,
    val propertyDefinitions: List<ShapePropertyDefinition> = emptyList(),
    val script: String? = null,
    val isCore: Boolean = false,
    val defaultWidth: Double? = null,
    val defaultHeight: Double? = null
) {
    fun toPromptGuideline(): String {
        val propsDesc = when {
            propertyDefinitions.isNotEmpty() -> {
                "with properties: {" + propertyDefinitions.joinToString(", ") { "\"${it.name}\": ${it.type}" } + "}"
            }
            properties != null && properties.isNotEmpty() -> {
                "with properties: {" + properties.entries.joinToString(", ") { "\"${it.key}\": \"${it.value}\"" } + "}"
            }
            else -> ""
        }
        val extra = if (propsDesc.isNotBlank()) " $propsDesc" else ""
        return "- \"$shapeType\" (Category: $category): $name - $description$extra"
    }
}

data class ScoredShape(
    val shape: ShapeDescriptor,
    val score: Double,
    val matchReasons: List<String> = emptyList()
)
