package de.einfloh.floxboard.whiteboard.domain.dgm

import com.fasterxml.jackson.annotation.*

enum class Movable(val value: String) {
    @JsonProperty("none") NONE("none"),
    @JsonProperty("horz") HORZ("horz"),
    @JsonProperty("vert") VERT("vert"),
    @JsonProperty("free") FREE("free"),
    @JsonProperty("parent") PARENT("parent");

    @JsonValue
    override fun toString(): String = value
}

enum class Sizable(val value: String) {
    @JsonProperty("none") NONE("none"),
    @JsonProperty("horz") HORZ("horz"),
    @JsonProperty("vert") VERT("vert"),
    @JsonProperty("free") FREE("free"),
    @JsonProperty("ratio") RATIO("ratio");

    @JsonValue
    override fun toString(): String = value
}

enum class FillStyle(val value: String) {
    @JsonProperty("none") NONE("none"),
    @JsonProperty("solid") SOLID("solid"),
    @JsonProperty("transparent") TRANSPARENT("transparent"),
    @JsonProperty("hachure") HACHURE("hachure"),
    @JsonProperty("zigzag") ZIGZAG("zigzag"),
    @JsonProperty("cross-hatch") CROSS_HATCH("cross-hatch"),
    @JsonProperty("dots") DOTS("dots");

    @JsonValue
    override fun toString(): String = value
}

enum class BorderPosition(val value: String) {
    @JsonProperty("center") CENTER("center"),
    @JsonProperty("inside") INSIDE("inside"),
    @JsonProperty("outside") OUTSIDE("outside");

    @JsonValue
    override fun toString(): String = value
}

enum class HorzAlign(val value: String) {
    @JsonProperty("left") LEFT("left"),
    @JsonProperty("center") CENTER("center"),
    @JsonProperty("right") RIGHT("right");

    @JsonValue
    override fun toString(): String = value
}

enum class VertAlign(val value: String) {
    @JsonProperty("top") TOP("top"),
    @JsonProperty("middle") MIDDLE("middle"),
    @JsonProperty("bottom") BOTTOM("bottom");

    @JsonValue
    override fun toString(): String = value
}

enum class LineType(val value: String) {
    @JsonProperty("straight") STRAIGHT("straight"),
    @JsonProperty("curve") CURVE("curve");

    @JsonValue
    override fun toString(): String = value
}

enum class LineEndType(val value: String) {
    @JsonProperty("flat") FLAT("flat"),
    @JsonProperty("arrow") ARROW("arrow"),
    @JsonProperty("solid-arrow") SOLID_ARROW("solid-arrow"),
    @JsonProperty("triangle") TRIANGLE("triangle"),
    @JsonProperty("triangle-filled") TRIANGLE_FILLED("triangle-filled"),
    @JsonProperty("diamond") DIAMOND("diamond"),
    @JsonProperty("diamond-filled") DIAMOND_FILLED("diamond-filled"),
    @JsonProperty("plus") PLUS("plus"),
    @JsonProperty("circle") CIRCLE("circle"),
    @JsonProperty("circle-plus") CIRCLE_PLUS("circle-plus"),
    @JsonProperty("circle-filled") CIRCLE_FILLED("circle-filled"),
    @JsonProperty("crowfoot-one") CROWFOOT_ONE("crowfoot-one"),
    @JsonProperty("crowfoot-only-one") CROWFOOT_ONLY_ONE("crowfoot-only-one"),
    @JsonProperty("crowfoot-zero-one") CROWFOOT_ZERO_ONE("crowfoot-zero-one"),
    @JsonProperty("crowfoot-many") CROWFOOT_MANY("crowfoot-many"),
    @JsonProperty("crowfoot-one-many") CROWFOOT_ONE_MANY("crowfoot-one-many"),
    @JsonProperty("crowfoot-zero-many") CROWFOOT_ZERO_MANY("crowfoot-zero-many"),
    @JsonProperty("cross") CROSS("cross"),
    @JsonProperty("dot") DOT("dot"),
    @JsonProperty("bar") BAR("bar"),
    @JsonProperty("square") SQUARE("square");

    @JsonValue
    override fun toString(): String = value
}

@JsonTypeInfo(
    use = JsonTypeInfo.Id.NAME,
    include = JsonTypeInfo.As.EXISTING_PROPERTY,
    property = "type",
    visible = true,
    defaultImpl = Obj::class
)
@JsonSubTypes(
    JsonSubTypes.Type(value = Doc::class, name = "Doc"),
    JsonSubTypes.Type(value = Page::class, name = "Page"),
    JsonSubTypes.Type(value = Box::class, name = "Box"),
    JsonSubTypes.Type(value = Path::class, name = "Path"),
    JsonSubTypes.Type(value = Line::class, name = "Line"),
    JsonSubTypes.Type(value = Rectangle::class, name = "Rectangle"),
    JsonSubTypes.Type(value = Ellipse::class, name = "Ellipse"),
    JsonSubTypes.Type(value = Text::class, name = "Text"),
    JsonSubTypes.Type(value = Image::class, name = "Image"),
    JsonSubTypes.Type(value = Icon::class, name = "Icon"),
    JsonSubTypes.Type(value = Connector::class, name = "Connector"),
    JsonSubTypes.Type(value = Freehand::class, name = "Freehand"),
    JsonSubTypes.Type(value = Highlighter::class, name = "Highlighter"),
    JsonSubTypes.Type(value = Group::class, name = "Group"),
    JsonSubTypes.Type(value = Frame::class, name = "Frame"),
    JsonSubTypes.Type(value = Mirror::class, name = "Mirror"),
    JsonSubTypes.Type(value = Embed::class, name = "Embed"),
    JsonSubTypes.Type(value = Shape::class, name = "Shape")
)
@JsonIgnoreProperties(ignoreUnknown = true)
@JsonInclude(JsonInclude.Include.NON_NULL)
open class Obj {
    var id: String? = null
    var type: String = "Obj"
    var parent: String? = null
    var children: MutableList<Obj> = mutableListOf()
    var customData: MutableMap<String, Any>? = null
}

@JsonIgnoreProperties(ignoreUnknown = true)
@JsonInclude(JsonInclude.Include.NON_NULL)
open class Doc : Obj() {
    init {
        type = "Doc"
    }

    var version: Int? = 1
}

@JsonIgnoreProperties(ignoreUnknown = true)
@JsonInclude(JsonInclude.Include.NON_NULL)
open class Shape : Obj() {
    init {
        type = "Shape"
    }

    var name: String? = null
    var description: String? = null
    var proto: Boolean? = null
    var tags: MutableList<String>? = null
    var enable: Boolean? = null
    var visible: Boolean? = null
    var movable: String? = null
    var sizable: String? = null
    var rotatable: Boolean? = null
    var containable: Boolean? = null
    var containableFilter: String? = null
    var movableParentFilter: String? = null
    var connectable: Boolean? = null
    var left: Double? = null
    var top: Double? = null
    var width: Double? = null
    var height: Double? = null
    var rotate: Double? = null
    var strokeColor: String? = null
    var strokeWidth: Double? = null
    var strokePattern: MutableList<Double>? = null
    var fillColor: String? = null
    var fillStyle: String? = null
    var fontColor: String? = null
    var fontFamily: String? = null
    var fontSize: Double? = null
    var fontStyle: String? = null
    var fontWeight: Int? = null
    var opacity: Double? = null
    var roughness: Double? = null
    var shadow: Boolean? = null
    var shadowColor: String? = null
    var shadowOffset: MutableList<Double>? = null
    var link: Any? = null
    var reference: String? = null
    var constraints: MutableList<Any>? = null
    var properties: MutableList<Any>? = null
    var scripts: MutableList<Any>? = null
}

@JsonIgnoreProperties(ignoreUnknown = true)
@JsonInclude(JsonInclude.Include.NON_NULL)
open class Page : Shape() {
    init {
        type = "Page"
    }

    var size: MutableList<Double>? = null
    var pageOrigin: MutableList<Double>? = null
    var pageScale: Double? = null
}

@JsonIgnoreProperties(ignoreUnknown = true)
@JsonInclude(JsonInclude.Include.NON_NULL)
open class Box : Shape() {
    init {
        type = "Box"
    }

    var padding: MutableList<Double>? = null
    var corners: MutableList<Double>? = null
    var borders: MutableList<Boolean>? = null
    var borderPosition: String? = null
    var anchored: Boolean? = null
    var anchorAngle: Double? = null
    var anchorLength: Double? = null
    var anchorPosition: Double? = null
    var textEditable: Boolean? = null
    var text: Any? = null
    var wordWrap: Boolean? = null
    var horzAlign: String? = null
    var vertAlign: String? = null
    var lineHeight: Double? = null
    var paragraphSpacing: Double? = null
}

@JsonIgnoreProperties(ignoreUnknown = true)
@JsonInclude(JsonInclude.Include.NON_NULL)
open class Rectangle : Box() {
    init {
        type = "Rectangle"
    }
}

@JsonIgnoreProperties(ignoreUnknown = true)
@JsonInclude(JsonInclude.Include.NON_NULL)
open class Ellipse : Box() {
    init {
        type = "Ellipse"
    }
}

@JsonIgnoreProperties(ignoreUnknown = true)
@JsonInclude(JsonInclude.Include.NON_NULL)
open class Text : Box() {
    init {
        type = "Text"
    }
}

@JsonIgnoreProperties(ignoreUnknown = true)
@JsonInclude(JsonInclude.Include.NON_NULL)
open class Path : Shape() {
    init {
        type = "Path"
    }

    var pathEditable: Boolean? = null
    var path: MutableList<MutableList<Double>>? = null
}

@JsonIgnoreProperties(ignoreUnknown = true)
@JsonInclude(JsonInclude.Include.NON_NULL)
open class Line : Path() {
    init {
        type = "Line"
    }

    var lineType: String? = null
    var headEndType: String? = null
    var tailEndType: String? = null
}

@JsonIgnoreProperties(ignoreUnknown = true)
@JsonInclude(JsonInclude.Include.NON_NULL)
open class Connector : Line() {
    init {
        type = "Connector"
    }

    var head: String? = null
    var tail: String? = null
    var headAnchor: MutableList<Double>? = null
    var tailAnchor: MutableList<Double>? = null
    var headMargin: Double? = null
    var tailMargin: Double? = null
}

@JsonIgnoreProperties(ignoreUnknown = true)
@JsonInclude(JsonInclude.Include.NON_NULL)
open class Freehand : Path() {
    init {
        type = "Freehand"
    }

    var thinning: Double? = null
    var tailTaper: Double? = null
    var headTaper: Double? = null
}

@JsonIgnoreProperties(ignoreUnknown = true)
@JsonInclude(JsonInclude.Include.NON_NULL)
open class Highlighter : Path() {
    init {
        type = "Highlighter"
    }
}

@JsonIgnoreProperties(ignoreUnknown = true)
@JsonInclude(JsonInclude.Include.NON_NULL)
open class Image : Box() {
    init {
        type = "Image"
    }

    var imageData: String? = null
    var imageWidth: Double? = null
    var imageHeight: Double? = null
}

@JsonIgnoreProperties(ignoreUnknown = true)
@JsonInclude(JsonInclude.Include.NON_NULL)
open class Icon : Box() {
    init {
        type = "Icon"
    }

    var viewWidth: Double? = null
    var viewHeight: Double? = null
    var data: MutableList<Any>? = null
}

@JsonIgnoreProperties(ignoreUnknown = true)
@JsonInclude(JsonInclude.Include.NON_NULL)
open class Group : Box() {
    init {
        type = "Group"
    }
}

@JsonIgnoreProperties(ignoreUnknown = true)
@JsonInclude(JsonInclude.Include.NON_NULL)
open class Frame : Box() {
    init {
        type = "Frame"
    }
}

@JsonIgnoreProperties(ignoreUnknown = true)
@JsonInclude(JsonInclude.Include.NON_NULL)
open class Mirror : Box() {
    init {
        type = "Mirror"
    }

    var subject: String? = null
}

@JsonIgnoreProperties(ignoreUnknown = true)
@JsonInclude(JsonInclude.Include.NON_NULL)
open class Embed : Box() {
    init {
        type = "Embed"
    }

    var src: String? = null
}
