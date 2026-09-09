package de.einfloh.floxboard.whiteboard

import de.einfloh.floxboard.license.domain.*
import de.einfloh.floxboard.whiteboard.api.dto.AddCollaboratorRequest
import de.einfloh.floxboard.whiteboard.api.dto.CreateSnapshotRequest
import de.einfloh.floxboard.whiteboard.api.dto.ForkSnapshotRequest
import de.einfloh.floxboard.whiteboard.api.dto.SaveWhiteboardRequest
import de.einfloh.floxboard.whiteboard.domain.CollaboratorRole
import de.einfloh.floxboard.whiteboard.domain.dgm.Doc
import de.einfloh.floxboard.whiteboard.domain.dgm.Page
import de.einfloh.floxboard.whiteboard.domain.dgm.Shape
import de.einfloh.util.KeycloakUserProvider
import io.quarkus.test.junit.QuarkusTest
import io.restassured.RestAssured.given
import io.restassured.http.ContentType
import jakarta.inject.Inject
import org.hamcrest.CoreMatchers.*
import org.hamcrest.Matchers.hasSize
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import java.time.Instant
import java.time.temporal.ChronoUnit
import java.util.*

@QuarkusTest
class WhiteboardHistoryResourceTest {

    @Inject
    lateinit var keycloakUserProvider: KeycloakUserProvider

    @Inject
    lateinit var licenseValidator: LicenseValidator

    @BeforeEach
    fun cleanUp() {
        val aliceToken = keycloakUserProvider.getAccessToken("alice@floxboard.io", "alice")
        given().auth().oauth2(aliceToken).`when`().delete("/api/v1/license")
        val aliceBoards = given().auth().oauth2(aliceToken).`when`().get("/api/v1/whiteboards?max=100").then().extract().jsonPath().getList<Map<String, Any>>("$")
        for (b in aliceBoards) {
            val id = b["id"]
            given().auth().oauth2(aliceToken).`when`().delete("/api/v1/whiteboards/$id")
        }

        val bobToken = keycloakUserProvider.getAccessToken("bob@floxboard.io", "bob")
        given().auth().oauth2(bobToken).`when`().delete("/api/v1/license")
        val bobBoards = given().auth().oauth2(bobToken).`when`().get("/api/v1/whiteboards?max=100").then().extract().jsonPath().getList<Map<String, Any>>("$")
        for (b in bobBoards) {
            val id = b["id"]
            given().auth().oauth2(bobToken).`when`().delete("/api/v1/whiteboards/$id")
        }
    }

    private fun activateProLicense(token: String) {
        val tokenPayload = LicensePayload(
            plan = LicensePlan.PRO,
            features = mapOf(
                "whiteboard:version_history" to true
            ),
            quotas = mapOf(
                "whiteboards" to QuotaDefinition(limit = -1, period = QuotaPeriod.LIFETIME)
            ),
            validUntil = Instant.now().plus(30, ChronoUnit.DAYS)
        )
        val signedKey = licenseValidator.generateSignedToken(tokenPayload)
        given()
            .auth().oauth2(token)
            .contentType(ContentType.JSON)
            .body(mapOf("licenseKey" to signedKey))
            .`when`().post("/api/v1/license/activate")
            .then()
            .statusCode(200)
    }

    private fun sampleDoc(text: String): Doc {
        return Doc().apply {
            id = "doc-1"
            version = 1
            children = mutableListOf(
                Page().apply {
                    id = "page-1"
                    children = mutableListOf(
                        de.einfloh.floxboard.whiteboard.domain.dgm.Rectangle().apply {
                            id = "rect-1"
                            left = 10.0
                            top = 20.0
                            width = 100.0
                            height = 50.0
                            this.text = text
                        }
                    )
                }
            )
        }
    }

    @Test
    fun testFeatureGatingForFreeAndProUsers() {
        val aliceToken = keycloakUserProvider.getAccessToken("alice@floxboard.io", "alice")

        // Create board as free user
        val boardId = given()
            .auth().oauth2(aliceToken)
            .contentType(ContentType.JSON)
            .body(SaveWhiteboardRequest(name = "Gated History Board", content = sampleDoc("v1")))
            .`when`().post("/api/v1/whiteboards")
            .then()
            .statusCode(200)
            .extract().path<String>("id")

        // 1. FREE plan user gets 403 on history endpoints
        given()
            .auth().oauth2(aliceToken)
            .`when`().get("/api/v1/whiteboards/$boardId/history")
            .then()
            .statusCode(403)

        // 2. Activate PRO plan for Alice
        activateProLicense(aliceToken)

        // 3. PRO plan user now gets 200 OK
        given()
            .auth().oauth2(aliceToken)
            .`when`().get("/api/v1/whiteboards/$boardId/history")
            .then()
            .statusCode(200)
    }

    @Test
    fun testSnapshotLifecycleAndPagination() {
        val aliceToken = keycloakUserProvider.getAccessToken("alice@floxboard.io", "alice")
        activateProLicense(aliceToken)

        // 1. Create board with initial content
        val boardId = given()
            .auth().oauth2(aliceToken)
            .contentType(ContentType.JSON)
            .body(SaveWhiteboardRequest(name = "History Lifecycle Board", content = sampleDoc("v1 content")))
            .`when`().post("/api/v1/whiteboards")
            .then()
            .statusCode(200)
            .extract().path<String>("id")

        // 2. Create manual snapshot 1
        val snap1Id = given()
            .auth().oauth2(aliceToken)
            .contentType(ContentType.JSON)
            .body(CreateSnapshotRequest(name = "Milestone Alpha", description = "First stable diagram"))
            .`when`().post("/api/v1/whiteboards/$boardId/history")
            .then()
            .statusCode(200)
            .body("id", notNullValue())
            .body("name", `is`("Milestone Alpha"))
            .body("description", `is`("First stable diagram"))
            .body("isAutomatic", `is`(false))
            .body("isGeneratedByAI", `is`(false))
            .body("createdBy", notNullValue())
            .extract().path<String>("id")

        // 3. Create manual snapshot 2
        val snap2Id = given()
            .auth().oauth2(aliceToken)
            .contentType(ContentType.JSON)
            .body(CreateSnapshotRequest(name = "Milestone Beta", description = "Second stable diagram"))
            .`when`().post("/api/v1/whiteboards/$boardId/history")
            .then()
            .statusCode(200)
            .body("id", notNullValue())
            .body("name", `is`("Milestone Beta"))
            .extract().path<String>("id")

        // 4. List snapshots
        val historyList = given()
            .auth().oauth2(aliceToken)
            .`when`().get("/api/v1/whiteboards/$boardId/history?start=0&max=10")
            .then()
            .statusCode(200)
            .extract().jsonPath().getList<Map<String, Any>>("$")

        // Should have initial auto-snapshot + milestone alpha + milestone beta = 3 snapshots
        assert(historyList.size >= 2)
        val firstItem = historyList[0]
        org.junit.jupiter.api.Assertions.assertEquals(snap2Id, firstItem["id"])

        // 5. Get snapshot 1 directly
        given()
            .auth().oauth2(aliceToken)
            .`when`().get("/api/v1/whiteboards/$boardId/history/$snap1Id")
            .then()
            .statusCode(200)
            .body("id", `is`(snap1Id))
            .body("name", `is`("Milestone Alpha"))
            .body("content.children[0].children[0].text", `is`("v1 content"))
    }

    @Test
    fun testRestoreAndForkWorkflows() {
        val aliceToken = keycloakUserProvider.getAccessToken("alice@floxboard.io", "alice")
        activateProLicense(aliceToken)

        // 1. Create board with initial content
        val boardId = given()
            .auth().oauth2(aliceToken)
            .contentType(ContentType.JSON)
            .body(SaveWhiteboardRequest(name = "Rollback Board", content = sampleDoc("State Alpha")))
            .`when`().post("/api/v1/whiteboards")
            .then()
            .statusCode(200)
            .extract().path<String>("id")

        // 2. Checkpoint Alpha
        val snapAlphaId = given()
            .auth().oauth2(aliceToken)
            .contentType(ContentType.JSON)
            .body(CreateSnapshotRequest(name = "State Alpha Checkpoint"))
            .`when`().post("/api/v1/whiteboards/$boardId/history")
            .then()
            .statusCode(200)
            .extract().path<String>("id")

        // 3. Update board to State Beta
        given()
            .auth().oauth2(aliceToken)
            .contentType(ContentType.JSON)
            .body(SaveWhiteboardRequest(id = UUID.fromString(boardId), name = "Rollback Board", content = sampleDoc("State Beta")))
            .`when`().post("/api/v1/whiteboards")
            .then()
            .statusCode(200)
            .body("content.children[0].children[0].text", `is`("State Beta"))

        // 4. Restore to State Alpha
        given()
            .auth().oauth2(aliceToken)
            .`when`().post("/api/v1/whiteboards/$boardId/history/$snapAlphaId/restore")
            .then()
            .statusCode(200)
            .body("id", `is`(boardId))
            .body("content.children[0].children[0].text", `is`("State Alpha"))

        // Verify board is actually in State Alpha
        given()
            .auth().oauth2(aliceToken)
            .`when`().get("/api/v1/whiteboards/$boardId")
            .then()
            .statusCode(200)
            .body("content.children[0].children[0].text", `is`("State Alpha"))

        // 5. Fork snapshot Alpha to a new board
        val forkedBoardId = given()
            .auth().oauth2(aliceToken)
            .contentType(ContentType.JSON)
            .body(ForkSnapshotRequest(name = "Forked Branch Board"))
            .`when`().post("/api/v1/whiteboards/$boardId/history/$snapAlphaId/fork")
            .then()
            .statusCode(200)
            .body("name", `is`("Forked Branch Board"))
            .body("content.children[0].children[0].text", `is`("State Alpha"))
            .extract().path<String>("id")

        // Verify forked board history exists
        given()
            .auth().oauth2(aliceToken)
            .`when`().get("/api/v1/whiteboards/$forkedBoardId/history")
            .then()
            .statusCode(200)
            .body("$", hasSize<Int>(1))
            .body("[0].name", containsString("Initial revision"))
            .body("[0].isAutomatic", `is`(true))
            .body("[0].isGeneratedByAI", `is`(false))
    }

    @Test
    fun testAutoSaveFifoPruningLimit() {
        val aliceToken = keycloakUserProvider.getAccessToken("alice@floxboard.io", "alice")
        activateProLicense(aliceToken)

        // 1. Create board (generates auto-snapshot 1)
        val boardId = given()
            .auth().oauth2(aliceToken)
            .contentType(ContentType.JSON)
            .body(SaveWhiteboardRequest(name = "AutoSave Retention Board", content = sampleDoc("initial")))
            .`when`().post("/api/v1/whiteboards")
            .then()
            .statusCode(200)
            .extract().path<String>("id")

        // 2. Create a manual milestone snapshot
        val milestoneId = given()
            .auth().oauth2(aliceToken)
            .contentType(ContentType.JSON)
            .body(CreateSnapshotRequest(name = "Permanent Milestone", description = "Must not be pruned"))
            .`when`().post("/api/v1/whiteboards/$boardId/history")
            .then()
            .statusCode(200)
            .extract().path<String>("id")

        // 3. Generate 25 auto-save updates
        for (i in 1..25) {
            given()
                .auth().oauth2(aliceToken)
                .contentType(ContentType.JSON)
                .body(SaveWhiteboardRequest(id = UUID.fromString(boardId), name = "AutoSave Retention Board", content = sampleDoc("update $i")))
                .`when`().post("/api/v1/whiteboards")
                .then()
                .statusCode(200)
        }

        // 4. Save with identical content (should NOT create a new snapshot)
        given()
            .auth().oauth2(aliceToken)
            .contentType(ContentType.JSON)
            .body(SaveWhiteboardRequest(id = UUID.fromString(boardId), name = "AutoSave Retention Board Renamed", content = sampleDoc("update 25")))
            .`when`().post("/api/v1/whiteboards")
            .then()
            .statusCode(200)

        // 5. Retrieve all snapshots (max 50)
        val snapshots = given()
            .auth().oauth2(aliceToken)
            .`when`().get("/api/v1/whiteboards/$boardId/history?start=0&max=50")
            .then()
            .statusCode(200)
            .extract().jsonPath().getList<Map<String, Any>>("$")

        // Auto-saves should be capped at 10 + 1 manual milestone = 11 total snapshots
        val autoSnapshots = snapshots.filter { it["isAutomatic"] == true }
        val manualSnapshots = snapshots.filter { it["isAutomatic"] == false }

        org.junit.jupiter.api.Assertions.assertEquals(10, autoSnapshots.size, "Auto-saves should be capped at 10")
        org.junit.jupiter.api.Assertions.assertEquals(1, manualSnapshots.size, "Manual milestone should be preserved")
        org.junit.jupiter.api.Assertions.assertEquals(milestoneId, manualSnapshots[0]["id"])
    }

    @Test
    fun testAccessControlAndCollaboration() {
        val aliceToken = keycloakUserProvider.getAccessToken("alice@floxboard.io", "alice")
        val bobToken = keycloakUserProvider.getAccessToken("bob@floxboard.io", "bob")
        activateProLicense(aliceToken)
        activateProLicense(bobToken)

        // Alice creates board
        val boardId = given()
            .auth().oauth2(aliceToken)
            .contentType(ContentType.JSON)
            .body(SaveWhiteboardRequest(name = "Collaborative History Board", content = sampleDoc("Collab v1")))
            .`when`().post("/api/v1/whiteboards")
            .then()
            .statusCode(200)
            .extract().path<String>("id")

        // Alice creates snapshot
        val snapId = given()
            .auth().oauth2(aliceToken)
            .contentType(ContentType.JSON)
            .body(CreateSnapshotRequest(name = "Alice Checkpoint"))
            .`when`().post("/api/v1/whiteboards/$boardId/history")
            .then()
            .statusCode(200)
            .extract().path<String>("id")

        // 1. Bob has no access yet -> 403
        given()
            .auth().oauth2(bobToken)
            .`when`().get("/api/v1/whiteboards/$boardId/history")
            .then()
            .statusCode(403)

        // 2. Add Bob as VIEWER
        given()
            .auth().oauth2(aliceToken)
            .contentType(ContentType.JSON)
            .body(AddCollaboratorRequest(email = "bob@floxboard.io", role = CollaboratorRole.VIEWER))
            .`when`().post("/api/v1/whiteboards/$boardId/collaborators")
            .then()
            .statusCode(200)

        // Bob as VIEWER can view history
        given()
            .auth().oauth2(bobToken)
            .`when`().get("/api/v1/whiteboards/$boardId/history")
            .then()
            .statusCode(200)
            .body("$", hasSize<Int>(2))

        // Bob as VIEWER cannot create snapshot -> 403
        given()
            .auth().oauth2(bobToken)
            .contentType(ContentType.JSON)
            .body(CreateSnapshotRequest(name = "Bob Attempt"))
            .`when`().post("/api/v1/whiteboards/$boardId/history")
            .then()
            .statusCode(403)

        // Bob as VIEWER cannot restore snapshot -> 403
        given()
            .auth().oauth2(bobToken)
            .`when`().post("/api/v1/whiteboards/$boardId/history/$snapId/restore")
            .then()
            .statusCode(403)

        // Bob as VIEWER can fork snapshot into his own board
        given()
            .auth().oauth2(bobToken)
            .contentType(ContentType.JSON)
            .body(ForkSnapshotRequest(name = "Bob's Independent Fork"))
            .`when`().post("/api/v1/whiteboards/$boardId/history/$snapId/fork")
            .then()
            .statusCode(200)
            .body("name", `is`("Bob's Independent Fork"))
    }

    @Test
    fun testIdenticalSaveDoesNotCreateSnapshot() {
        val aliceToken = keycloakUserProvider.getAccessToken("alice@floxboard.io", "alice")
        activateProLicense(aliceToken)

        // 1. Create board with initial content
        val boardId = given()
            .auth().oauth2(aliceToken)
            .contentType(ContentType.JSON)
            .body(SaveWhiteboardRequest(name = "Deduplication Board", content = sampleDoc("State Alpha")))
            .`when`().post("/api/v1/whiteboards")
            .then()
            .statusCode(200)
            .extract().path<String>("id")

        // Initial snapshot created
        val initialSnapshots = given()
            .auth().oauth2(aliceToken)
            .`when`().get("/api/v1/whiteboards/$boardId/history")
            .then()
            .statusCode(200)
            .extract().jsonPath().getList<Map<String, Any>>("$")
        org.junit.jupiter.api.Assertions.assertEquals(1, initialSnapshots.size)

        // 2. Save board with identical content multiple times (e.g., name change or touching board)
        for (i in 1..3) {
            given()
                .auth().oauth2(aliceToken)
                .contentType(ContentType.JSON)
                .body(SaveWhiteboardRequest(id = UUID.fromString(boardId), name = "Deduplication Board Touch $i", content = sampleDoc("State Alpha")))
                .`when`().post("/api/v1/whiteboards")
                .then()
                .statusCode(200)
        }

        // 3. Verify snapshot count is still exactly 1
        val snapshotsAfterTouches = given()
            .auth().oauth2(aliceToken)
            .`when`().get("/api/v1/whiteboards/$boardId/history")
            .then()
            .statusCode(200)
            .extract().jsonPath().getList<Map<String, Any>>("$")
        org.junit.jupiter.api.Assertions.assertEquals(1, snapshotsAfterTouches.size)
        org.junit.jupiter.api.Assertions.assertEquals(false, snapshotsAfterTouches[0]["isGeneratedByAI"])
    }

    @Test
    fun testIsGeneratedByAISnapshotCreationAndListing() {
        val aliceToken = keycloakUserProvider.getAccessToken("alice@floxboard.io", "alice")
        activateProLicense(aliceToken)

        val boardId = given()
            .auth().oauth2(aliceToken)
            .contentType(ContentType.JSON)
            .body(SaveWhiteboardRequest(name = "AI Snapshot Board", content = sampleDoc("Initial AI base")))
            .`when`().post("/api/v1/whiteboards")
            .then()
            .statusCode(200)
            .extract().path<String>("id")

        // 1. Initial snapshot has isGeneratedByAI = false
        val initialSnap = given()
            .auth().oauth2(aliceToken)
            .`when`().get("/api/v1/whiteboards/$boardId/history")
            .then()
            .statusCode(200)
            .body("[0].isGeneratedByAI", `is`(false))
            .extract().jsonPath().getList<Map<String, Any>>("$")
        org.junit.jupiter.api.Assertions.assertEquals(1, initialSnap.size)

        // 2. Create AI generated snapshot
        val aiSnapId = given()
            .auth().oauth2(aliceToken)
            .contentType(ContentType.JSON)
            .body(CreateSnapshotRequest(name = "AI Generated Diagram", description = "Prompt: microservices architecture", isGeneratedByAI = true))
            .`when`().post("/api/v1/whiteboards/$boardId/history")
            .then()
            .statusCode(200)
            .body("id", notNullValue())
            .body("name", `is`("AI Generated Diagram"))
            .body("isGeneratedByAI", `is`(true))
            .body("isAutomatic", `is`(false))
            .extract().path<String>("id")

        // 3. Create non-AI manual snapshot
        val manualSnapId = given()
            .auth().oauth2(aliceToken)
            .contentType(ContentType.JSON)
            .body(CreateSnapshotRequest(name = "Manual Tweaks", description = "Adjusted positions", isGeneratedByAI = false))
            .`when`().post("/api/v1/whiteboards/$boardId/history")
            .then()
            .statusCode(200)
            .body("id", notNullValue())
            .body("name", `is`("Manual Tweaks"))
            .body("isGeneratedByAI", `is`(false))
            .extract().path<String>("id")

        // 4. Fetch AI snapshot directly by ID
        given()
            .auth().oauth2(aliceToken)
            .`when`().get("/api/v1/whiteboards/$boardId/history/$aiSnapId")
            .then()
            .statusCode(200)
            .body("id", `is`(aiSnapId))
            .body("isGeneratedByAI", `is`(true))

        // 5. Fetch manual snapshot directly by ID
        given()
            .auth().oauth2(aliceToken)
            .`when`().get("/api/v1/whiteboards/$boardId/history/$manualSnapId")
            .then()
            .statusCode(200)
            .body("id", `is`(manualSnapId))
            .body("isGeneratedByAI", `is`(false))

        // 6. List all history and verify chronological ordering (newest first) and flags
        val list = given()
            .auth().oauth2(aliceToken)
            .`when`().get("/api/v1/whiteboards/$boardId/history")
            .then()
            .statusCode(200)
            .extract().jsonPath().getList<Map<String, Any>>("$")

        org.junit.jupiter.api.Assertions.assertEquals(3, list.size)
        // Newest is manualSnapId
        org.junit.jupiter.api.Assertions.assertEquals(manualSnapId, list[0]["id"])
        org.junit.jupiter.api.Assertions.assertEquals(false, list[0]["isGeneratedByAI"])
        // Middle is aiSnapId
        org.junit.jupiter.api.Assertions.assertEquals(aiSnapId, list[1]["id"])
        org.junit.jupiter.api.Assertions.assertEquals(true, list[1]["isGeneratedByAI"])
        // Oldest is initial auto snapshot
        org.junit.jupiter.api.Assertions.assertEquals(false, list[2]["isGeneratedByAI"])
    }
}
