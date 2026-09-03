package de.einfloh.floxboard.whiteboard.api.dto

import de.einfloh.floxboard.whiteboard.domain.dgm.Doc
import java.util.UUID

data class SaveWhiteboardRequest(
    val id: UUID? = null,
    val name: String,
    val content: Doc? = null
)
