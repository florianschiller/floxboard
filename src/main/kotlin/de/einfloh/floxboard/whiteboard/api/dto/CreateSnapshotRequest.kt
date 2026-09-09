package de.einfloh.floxboard.whiteboard.api.dto

import com.fasterxml.jackson.annotation.JsonProperty

data class CreateSnapshotRequest(
    val name: String? = null,
    val description: String? = null,
    @JsonProperty("isGeneratedByAI")
    val isGeneratedByAI: Boolean = false
)
