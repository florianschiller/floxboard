package de.einfloh.floxboard.whiteboard.storage

import jakarta.enterprise.context.ApplicationScoped
import org.eclipse.microprofile.config.inject.ConfigProperty
import java.io.InputStream
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.Paths
import java.nio.file.StandardCopyOption
import java.util.UUID

@ApplicationScoped
class FileSystemAssetStorageService(
    @param:ConfigProperty(name = "floxboard.storage.assets-dir", defaultValue = "./data/assets")
    private val assetsDirString: String
) : AssetStorageService {

    private val baseDir: Path by lazy {
        val path = Paths.get(assetsDirString).toAbsolutePath().normalize()
        Files.createDirectories(path)
        path
    }

    private fun getExtensionForMimeType(mimeType: String): String {
        return when (mimeType.lowercase().trim()) {
            "image/png" -> "png"
            "image/jpeg", "image/jpg" -> "jpg"
            "image/webp" -> "webp"
            "image/svg+xml" -> "svg"
            "image/gif" -> "gif"
            else -> "bin"
        }
    }

    private fun resolveWhiteboardDir(whiteboardId: UUID): Path {
        val boardDir = baseDir.resolve("whiteboards").resolve(whiteboardId.toString()).normalize()
        if (!boardDir.startsWith(baseDir)) {
            throw SecurityException("Invalid whiteboard path traversal attempt")
        }
        Files.createDirectories(boardDir)
        return boardDir
    }

    override fun store(
        whiteboardId: UUID,
        assetId: UUID,
        inputStream: InputStream,
        mimeType: String,
        sizeBytes: Long?
    ): StoredAssetMetadata {
        val boardDir = resolveWhiteboardDir(whiteboardId)
        val ext = getExtensionForMimeType(mimeType)
        val targetFile = boardDir.resolve("$assetId.$ext").normalize()
        if (!targetFile.startsWith(boardDir)) {
            throw SecurityException("Invalid asset path traversal attempt")
        }

        Files.copy(inputStream, targetFile, StandardCopyOption.REPLACE_EXISTING)
        val actualSize = Files.size(targetFile)

        val metaFile = boardDir.resolve("$assetId.meta").normalize()
        Files.writeString(metaFile, mimeType)

        val relativePath = "whiteboards/$whiteboardId/$assetId.$ext"
        return StoredAssetMetadata(
            assetId = assetId,
            whiteboardId = whiteboardId,
            contentType = mimeType,
            sizeBytes = actualSize,
            relativePath = relativePath
        )
    }

    override fun load(whiteboardId: UUID, assetId: UUID): StoredAssetResource? {
        val boardDir = resolveWhiteboardDir(whiteboardId)
        if (!Files.exists(boardDir)) return null

        val files = Files.list(boardDir).use { stream ->
            stream.filter { 
                val name = it.fileName.toString()
                name.startsWith(assetId.toString()) && !name.endsWith(".meta")
            }.toList()
        }
        val assetFile = files.firstOrNull() ?: return null
        if (!Files.exists(assetFile)) return null

        val metaFile = boardDir.resolve("$assetId.meta").normalize()
        val contentType = if (Files.exists(metaFile)) {
            Files.readString(metaFile).trim()
        } else {
            Files.probeContentType(assetFile) ?: "application/octet-stream"
        }

        val size = Files.size(assetFile)
        val lastModified = Files.getLastModifiedTime(assetFile).toInstant()

        return StoredAssetResource(
            inputStream = Files.newInputStream(assetFile),
            contentType = contentType,
            sizeBytes = size,
            lastModified = lastModified
        )
    }

    override fun delete(whiteboardId: UUID, assetId: UUID): Boolean {
        val boardDir = resolveWhiteboardDir(whiteboardId)
        if (!Files.exists(boardDir)) return false

        var deletedAny = false
        Files.list(boardDir).use { stream ->
            stream.filter { it.fileName.toString().startsWith(assetId.toString()) }.forEach {
                if (Files.deleteIfExists(it)) {
                    deletedAny = true
                }
            }
        }
        return deletedAny
    }

    override fun deleteForWhiteboard(whiteboardId: UUID): Boolean {
        val boardDir = resolveWhiteboardDir(whiteboardId)
        if (!Files.exists(boardDir)) return false

        Files.walk(boardDir).use { stream ->
            stream.sorted(Comparator.reverseOrder()).forEach {
                Files.deleteIfExists(it)
            }
        }
        return true
    }
}
