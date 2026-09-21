import { Editor, textUtils, Group, Page, Doc, Image as DgmImage, Sizable, Shape, Rectangle, Frame, Connector, shapeInstantiator, manipulatorManager } from '@dgmjs/core';

/**
 * Proportionally scales pixel font sizes (e.g. "bold 12px Roboto") inside a CSS font declaration string.
 */
export const scaleFontString = (fontStr: string, scale: number): string => {
  if (!fontStr || typeof fontStr !== 'string' || scale <= 0 || Math.abs(scale - 1) < 0.001) {
    return fontStr;
  }
  return fontStr.replace(/(\d+(?:\.\d+)?)\s*px/g, (_, px) => {
    const newPx = Math.max(1, Math.round(parseFloat(px) * scale * 10) / 10);
    return `${newPx}px`;
  });
};

/**
 * Safely executes a Canvas2D drawing script against an HTML5 2D rendering context.
 * The script receives `(ctx, shape)` and draws relative to the shape's local coordinate origin (0, 0).
 */
export const executeShapeScript = (ctx: CanvasRenderingContext2D, shape: any): boolean => {
  if (!ctx || !shape) return false;
  const scriptCode = shape.script ?? shape.customData?.script;
  if (!scriptCode) return false;

  try {
    if (typeof scriptCode === 'function') {
      scriptCode(ctx, shape);
      return true;
    }
    if (typeof scriptCode === 'string') {
      const trimmed = scriptCode.trim();
      if (!trimmed) return false;
      if (trimmed.startsWith('function') || trimmed.startsWith('(') || trimmed.includes('=>')) {
        const fn = new Function('ctx', 'shape', `"use strict"; return (${trimmed})(ctx, shape);`);
        fn(ctx, shape);
      } else {
        const fn = new Function('ctx', 'shape', `"use strict"; ${trimmed}`);
        fn(ctx, shape);
      }
      return true;
    }
  } catch (err) {
    console.warn(`[floxBoard] Failed to execute shape script for ${shape.id || 'shape'}:`, err);
    return false;
  }
  return false;
};

/**
 * Generates starter Canvas2D script boilerplate based on the shape's visual attributes, category, and dimensions.
 */
export const generateDefaultShapeScript = (shape: any): string => {
  if (!shape) return '';
  const strokeColor = shape.strokeColor || '#334155';
  const fillColor = shape.fillColor || '#ffffff';
  const strokeWidth = shape.strokeWidth || 2;

  const isConnector = isOpenLineShape(shape);
  const isFrame = shape.type === 'Frame' || shape._type === 'Frame' || Boolean(shape.isFrame);
  const isImage = shape.type === 'Image' || shape._type === 'Image' || Boolean(shape.imageData);

  if (isConnector) {
    return `// Canvas2D Custom Connector Drawing Script
// ctx: CanvasRenderingContext2D (draws at local 0,0)
// shape: shape properties, lineStyle, and headEndType/tailEndType
const w = shape.width || 200;
const h = shape.height || 100;

ctx.save();
ctx.strokeStyle = shape.strokeColor || '${strokeColor}';
ctx.lineWidth = shape.strokeWidth || ${strokeWidth};
if (shape.attributes?.lineStyle === 'dashed' || shape.lineStyle === 'dashed') {
  ctx.setLineDash([8, 6]);
} else if (shape.attributes?.lineStyle === 'dotted' || shape.lineStyle === 'dotted') {
  ctx.setLineDash([2, 4]);
}

ctx.beginPath();
ctx.moveTo(10, h / 2);
ctx.lineTo(w - 20, h / 2);
ctx.stroke();

// Draw head arrowhead
ctx.fillStyle = shape.strokeColor || '${strokeColor}';
ctx.beginPath();
ctx.moveTo(w - 20, h / 2 - 6);
ctx.lineTo(w - 5, h / 2);
ctx.lineTo(w - 20, h / 2 + 6);
ctx.closePath();
ctx.fill();

ctx.restore();`;
  }

  if (isFrame) {
    const frameTitle = shape.title || shape.name || 'Frame Container';
    return `// Canvas2D Custom Frame Container Script
// ctx: CanvasRenderingContext2D (draws at local 0,0)
// shape: shape properties, dimensions, and frame title
const w = shape.width || 400;
const h = shape.height || 300;
const title = shape.title || shape.name || '${frameTitle}';

ctx.save();
// Background container
ctx.fillStyle = shape.fillColor || '${fillColor}';
ctx.strokeStyle = shape.strokeColor || '${strokeColor}';
ctx.lineWidth = shape.strokeWidth || ${strokeWidth};
ctx.beginPath();
ctx.roundRect(0, 0, w, h, 8);
ctx.fill();
ctx.stroke();

// Header bar
ctx.fillStyle = '#f1f5f9';
ctx.beginPath();
ctx.roundRect(0, 0, w, 28, [8, 8, 0, 0]);
ctx.fill();
ctx.stroke();

// Title label
ctx.fillStyle = '#334155';
ctx.font = 'bold 12px Roboto, sans-serif';
ctx.fillText(title, 12, 18);

ctx.restore();`;
  }

  if (isImage) {
    return `// Canvas2D Custom Image Script
// ctx: CanvasRenderingContext2D (draws at local 0,0)
// shape: image dimensions, radius, opacity, and properties
const w = shape.width || 200;
const h = shape.height || 150;
const radius = shape.cornerRadius || 8;

ctx.save();
ctx.globalAlpha = typeof shape.opacity === 'number' ? shape.opacity : 1;
ctx.beginPath();
ctx.roundRect(0, 0, w, h, radius);
ctx.clip();

if (shape.imageData && shape.imageElement) {
  ctx.drawImage(shape.imageElement, 0, 0, w, h);
} else {
  // Placeholder backdrop
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#64748b';
  ctx.font = '12px Roboto, sans-serif';
  ctx.fillText('Image: ' + (shape.altText || 'Photo Asset'), 12, h / 2);
}

// Border overlay
if (shape.strokeColor && shape.strokeWidth) {
  ctx.strokeStyle = shape.strokeColor;
  ctx.lineWidth = shape.strokeWidth;
  ctx.strokeRect(0, 0, w, h);
}

ctx.restore();`;
  }

  const shapeType = shape.type || shape._type || 'Rectangle';
  if (shapeType === 'Ellipse' || shapeType === 'Circle' || shapeType === 'Oval') {
    return `// Canvas2D Custom Drawing Script
// ctx: CanvasRenderingContext2D (draws at local 0,0)
// shape: shape properties and dimensions
const w = shape.width;
const h = shape.height;
const rx = w / 2;
const ry = h / 2;

ctx.save();
ctx.fillStyle = shape.fillColor || '${fillColor}';
ctx.strokeStyle = shape.strokeColor || '${strokeColor}';
ctx.lineWidth = shape.strokeWidth || ${strokeWidth};

ctx.beginPath();
ctx.ellipse(rx, ry, rx, ry, 0, 0, Math.PI * 2);
ctx.fill();
ctx.stroke();

ctx.restore();`;
  }

  return `// Canvas2D Custom Drawing Script
// ctx: CanvasRenderingContext2D (draws at local 0,0)
// shape: shape properties and dimensions
const w = shape.width;
const h = shape.height;
const radius = 8;

ctx.save();
ctx.fillStyle = shape.fillColor || '${fillColor}';
ctx.strokeStyle = shape.strokeColor || '${strokeColor}';
ctx.lineWidth = shape.strokeWidth || ${strokeWidth};

ctx.beginPath();
ctx.roundRect(0, 0, w, h, radius);
ctx.fill();
ctx.stroke();

ctx.restore();`;
};

let isScriptHookInstalled = false;

/**
 * Installs the custom Canvas2D drawing lifecycle hook on Shape.prototype and registers
 * the Custom shape type in DGM's shape instantiator.
 */
export const setupScriptedShapeRendering = (): void => {
  // Register Custom shape type in shapeInstantiator
  if (typeof shapeInstantiator?.register === 'function') {
    try {
      shapeInstantiator.register('Custom', () => {
        const customShape = new Rectangle();
        customShape.type = 'Custom';
        customShape.textEditable = false;
        return customShape;
      });
    } catch (err) {
      console.warn('[floxBoard] Failed to register Custom type in shapeInstantiator:', err);
    }
  }

  // Register Custom shape manipulator in manipulatorManager
  if (manipulatorManager && typeof manipulatorManager.define === 'function') {
    try {
      if (!manipulatorManager.get('Custom')) {
        const rectManipulator = manipulatorManager.get('Rectangle');
        if (rectManipulator) {
          manipulatorManager.define('Custom', rectManipulator);
        }
      }
    } catch (err) {
      console.warn('[floxBoard] Failed to register Custom manipulator in manipulatorManager:', err);
    }
  }

  if (isScriptHookInstalled) return;

  // Hook into Shape.prototype to preserve properties, scripts, and customData across DGM lifecycle
  if (Shape && Shape.prototype) {
    const originalDraw = Shape.prototype.draw;
    const originalToJSON = Shape.prototype.toJSON;
    const originalFromJSON = Shape.prototype.fromJSON;
    const originalAssign = Shape.prototype.assign;
    const originalClone = Shape.prototype.clone;

    if (typeof originalToJSON === 'function') {
      Shape.prototype.toJSON = function (saveChildren?: boolean) {
        const json = originalToJSON.call(this, saveChildren);
        const anyThis = this as any;
        if (json) {
          if (anyThis.customData !== undefined) {
            try {
              json.customData = JSON.parse(JSON.stringify(anyThis.customData));
            } catch {
              json.customData = { ...anyThis.customData };
            }
          }
          if (anyThis.properties !== undefined) {
            try {
              json.properties = JSON.parse(JSON.stringify(anyThis.properties));
            } catch {
              json.properties = { ...anyThis.properties };
            }
          } else if (anyThis.customData?.properties !== undefined) {
            try {
              json.properties = JSON.parse(JSON.stringify(anyThis.customData.properties));
            } catch {
              json.properties = { ...anyThis.customData.properties };
            }
          }
          if (anyThis.script !== undefined) {
            json.script = typeof anyThis.script === 'function' ? anyThis.script.toString() : anyThis.script;
          } else if (anyThis.customData?.script !== undefined) {
            json.script = anyThis.customData.script;
          }
          if (anyThis.defaultScript !== undefined) {
            json.defaultScript = typeof anyThis.defaultScript === 'function' ? anyThis.defaultScript.toString() : anyThis.defaultScript;
          } else if (anyThis.customData?.defaultScript !== undefined) {
            json.defaultScript = anyThis.customData.defaultScript;
          }

          if (json.properties && (!json.customData || !json.customData.properties)) {
            json.customData = { ...(json.customData || {}), properties: json.properties };
          }
          if (json.script !== undefined && (!json.customData || json.customData.script === undefined)) {
            json.customData = { ...(json.customData || {}), script: json.script };
          }
          if (json.defaultScript !== undefined && (!json.customData || json.customData.defaultScript === undefined)) {
            json.customData = { ...(json.customData || {}), defaultScript: json.defaultScript };
          }
        }
        return json;
      };
    }

    if (typeof originalFromJSON === 'function') {
      Shape.prototype.fromJSON = function (json: any) {
        const res = originalFromJSON.call(this, json);
        const anyThis = this as any;
        if (json) {
          if (json.customData !== undefined) {
            try {
              anyThis.customData = JSON.parse(JSON.stringify(json.customData));
            } catch {
              anyThis.customData = { ...json.customData };
            }
          }
          if (json.properties !== undefined) {
            try {
              anyThis.properties = JSON.parse(JSON.stringify(json.properties));
            } catch {
              anyThis.properties = { ...json.properties };
            }
          }
          if (json.script !== undefined) {
            anyThis.script = json.script;
          }
          if (json.defaultScript !== undefined) {
            anyThis.defaultScript = json.defaultScript;
          }

          if (anyThis.properties && (!anyThis.customData || !anyThis.customData.properties)) {
            anyThis.customData = { ...(anyThis.customData || {}), properties: JSON.parse(JSON.stringify(anyThis.properties)) };
          } else if (anyThis.customData?.properties && !anyThis.properties) {
            anyThis.properties = JSON.parse(JSON.stringify(anyThis.customData.properties));
          }
          if (anyThis.script !== undefined && (!anyThis.customData || anyThis.customData.script === undefined)) {
            anyThis.customData = { ...(anyThis.customData || {}), script: anyThis.script };
          } else if (anyThis.customData?.script !== undefined && anyThis.script === undefined) {
            anyThis.script = anyThis.customData.script;
          }
          if (anyThis.defaultScript !== undefined && (!anyThis.customData || anyThis.customData.defaultScript === undefined)) {
            anyThis.customData = { ...(anyThis.customData || {}), defaultScript: anyThis.defaultScript };
          } else if (anyThis.customData?.defaultScript !== undefined && anyThis.defaultScript === undefined) {
            anyThis.defaultScript = anyThis.customData.defaultScript;
          }
        }
        return res;
      };
    }

    Shape.prototype.assign = function (other: any) {
      const res = typeof originalAssign === 'function' ? originalAssign.call(this, other) : Object.assign(this, other);
      const anyThis = this as any;
      if (other) {
        if (other.customData !== undefined) {
          try {
            anyThis.customData = JSON.parse(JSON.stringify(other.customData));
          } catch {
            anyThis.customData = { ...other.customData };
          }
        }
        if (other.properties !== undefined) {
          try {
            anyThis.properties = JSON.parse(JSON.stringify(other.properties));
          } catch {
            anyThis.properties = { ...other.properties };
          }
        }
        if (other.script !== undefined) {
          anyThis.script = other.script;
        }
        if (other.defaultScript !== undefined) {
          anyThis.defaultScript = other.defaultScript;
        }

        if (anyThis.properties && (!anyThis.customData || !anyThis.customData.properties)) {
          anyThis.customData = { ...(anyThis.customData || {}), properties: JSON.parse(JSON.stringify(anyThis.properties)) };
        } else if (anyThis.customData?.properties && !anyThis.properties) {
          anyThis.properties = JSON.parse(JSON.stringify(anyThis.customData.properties));
        }
        if (anyThis.script !== undefined && (!anyThis.customData || anyThis.customData.script === undefined)) {
          anyThis.customData = { ...(anyThis.customData || {}), script: anyThis.script };
        } else if (anyThis.customData?.script !== undefined && anyThis.script === undefined) {
          anyThis.script = anyThis.customData.script;
        }
        if (anyThis.defaultScript !== undefined && (!anyThis.customData || anyThis.customData.defaultScript === undefined)) {
          anyThis.customData = { ...(anyThis.customData || {}), defaultScript: anyThis.defaultScript };
        } else if (anyThis.customData?.defaultScript !== undefined && anyThis.defaultScript === undefined) {
          anyThis.defaultScript = anyThis.customData.defaultScript;
        }
      }
      return res;
    };

    Shape.prototype.clone = function (deep?: boolean) {
      const cloned = typeof originalClone === 'function' ? originalClone.call(this, deep) : Object.assign(Object.create(Object.getPrototypeOf(this)), this);
      const anyThis = this as any;
      if (cloned) {
        if (anyThis.customData !== undefined) {
          try {
            cloned.customData = JSON.parse(JSON.stringify(anyThis.customData));
          } catch {
            cloned.customData = { ...anyThis.customData };
          }
        }
        if (anyThis.properties !== undefined) {
          try {
            cloned.properties = JSON.parse(JSON.stringify(anyThis.properties));
          } catch {
            cloned.properties = { ...anyThis.properties };
          }
        }
        if (anyThis.script !== undefined) {
          cloned.script = anyThis.script;
        }
        if (anyThis.defaultScript !== undefined) {
          cloned.defaultScript = anyThis.defaultScript;
        }

        if (cloned.properties && (!cloned.customData || !cloned.customData.properties)) {
          cloned.customData = { ...(cloned.customData || {}), properties: JSON.parse(JSON.stringify(cloned.properties)) };
        } else if (cloned.customData?.properties && !cloned.properties) {
          cloned.properties = JSON.parse(JSON.stringify(cloned.customData.properties));
        }
        if (cloned.script !== undefined && (!cloned.customData || cloned.customData.script === undefined)) {
          cloned.customData = { ...(cloned.customData || {}), script: cloned.script };
        } else if (cloned.customData?.script !== undefined && cloned.script === undefined) {
          cloned.script = cloned.customData.script;
        }
        if (cloned.defaultScript !== undefined && (!cloned.customData || cloned.customData.defaultScript === undefined)) {
          cloned.customData = { ...(cloned.customData || {}), defaultScript: cloned.defaultScript };
        } else if (cloned.customData?.defaultScript !== undefined && cloned.defaultScript === undefined) {
          cloned.defaultScript = cloned.customData.defaultScript;
        }
      }
      return cloned;
    };

    Shape.prototype.draw = function (canvas: any, showDOM = false) {
      if (!this.visible) return;

      const anyThis = this as any;
      if (!anyThis.script && anyThis.customData?.script) {
        anyThis.script = anyThis.customData.script;
      }
      if (!anyThis.properties && anyThis.customData?.properties) {
        anyThis.properties = anyThis.customData.properties;
      }
      if (anyThis.properties && (!anyThis.customData || !anyThis.customData.properties)) {
        anyThis.customData = { ...(anyThis.customData || {}), properties: anyThis.properties };
      }
      if (anyThis.script && (!anyThis.customData || anyThis.customData.script === undefined)) {
        anyThis.customData = { ...(anyThis.customData || {}), script: anyThis.script };
      }

      if (anyThis.script) {
        canvas.save();
        this.localTransform(canvas);
        if (typeof (this as any).drawLink === 'function') {
          (this as any).drawLink(canvas, showDOM);
        }

        const ctx = canvas?.context;
        if (ctx) {
          const x = this.left ?? (anyThis.rect ? Math.min(anyThis.rect[0][0], anyThis.rect[1][0]) : 0);
          const y = this.top ?? (anyThis.rect ? Math.min(anyThis.rect[0][1], anyThis.rect[1][1]) : 0);
          const w = this.width ?? (anyThis.rect ? Math.abs(anyThis.rect[1][0] - anyThis.rect[0][0]) : 100);
          const h = this.height ?? (anyThis.rect ? Math.abs(anyThis.rect[1][1] - anyThis.rect[0][1]) : 60);

          let initialW = anyThis.customData?.initialWidth;
          let initialH = anyThis.customData?.initialHeight;
          if ((!initialW || !initialH) && w && h) {
            initialW = initialW || w;
            initialH = initialH || h;
            anyThis.customData = {
              ...anyThis.customData,
              initialWidth: initialW,
              initialHeight: initialH,
            };
          }

          const scaleX = (initialW && initialW > 0) ? w / initialW : 1;
          const scaleY = (initialH && initialH > 0) ? h / initialH : 1;

          ctx.save();
          ctx.translate(x, y);
          if (scaleX > 0 && scaleY > 0 && (Math.abs(scaleX - 1) >= 0.001 || Math.abs(scaleY - 1) >= 0.001)) {
            ctx.scale(scaleX, scaleY);
          }

          const shapeForScript = (initialW !== undefined && initialH !== undefined && (initialW !== w || initialH !== h))
            ? new Proxy(this, {
                get(target, prop) {
                  if (prop === 'width') return initialW;
                  if (prop === 'height') return initialH;
                  return Reflect.get(target, prop, target);
                },
              })
            : this;

          let rendered = false;
          try {
            rendered = executeShapeScript(ctx, shapeForScript);
          } catch (err) {
            console.warn('[floxBoard] Shape draw script exception:', err);
          }

          if (!rendered) {
            // Fallback rendering
            ctx.fillStyle = this.fillColor || '#ffffff';
            ctx.strokeStyle = this.strokeColor || '#334155';
            ctx.lineWidth = this.strokeWidth || 1.5;
            const drawW = initialW || w;
            const drawH = initialH || h;
            ctx.fillRect(0, 0, drawW, drawH);
            ctx.strokeRect(0, 0, drawW, drawH);
          }
          ctx.restore();

          if (typeof (this as any).renderText === 'function') {
            try {
              (this as any).renderText(canvas);
            } catch {}
          }
        } else if (anyThis._memoCanvas && typeof anyThis._memoCanvas.draw === 'function') {
          anyThis._memoCanvas.draw(canvas);
        }

        if (Array.isArray(this.children)) {
          this.children.forEach((s: any) => s && typeof s.draw === 'function' && s.draw(canvas, showDOM));
        }
        canvas.restore();
      } else {
        originalDraw.call(this, canvas, showDOM);
      }
    };

    if (Frame && Frame.prototype) {
      const originalFrameRenderDefault = Frame.prototype.renderDefault;
      Frame.prototype.renderDefault = function (canvas: any) {
        const isFilled = this.fillStyle && this.fillStyle !== 'none' && this.fillStyle !== 0 && this.fillColor && this.fillColor !== 'transparent' && this.fillColor !== '$transparent' && this.fillColor !== 'none';
        if (isFilled) {
          try {
            canvas.fillRoundRect(
              this.left,
              this.top,
              this.right,
              this.bottom,
              typeof this.computeCorners === 'function' ? this.computeCorners() : (this.corners || [0, 0, 0, 0]),
              typeof this.getSeed === 'function' ? this.getSeed() : 1
            );
          } catch (e) {
            console.warn('[floxBoard] Frame fillRoundRect error:', e);
          }
        }
        if (typeof originalFrameRenderDefault === 'function') {
          originalFrameRenderDefault.call(this, canvas);
        } else {
          if (this.text) {
            const context = canvas?.context;
            if (context) {
              context.save();
              context.font = '14px ' + (this.fontFamily || 'sans-serif');
              const textMetric = typeof canvas.textMetric === 'function' ? canvas.textMetric(this.text, context.font) : { width: 50 };
              canvas.fillStyle = '#ffffff';
              canvas.strokeStyle = 'none';
              canvas.fillRect?.(this.left + 8, this.top - 20, this.left + 8 + textMetric.width + 12, this.top);
              canvas.fillStyle = this.strokeColor;
              canvas.fillText?.(this.text, this.left + 14, this.top - 5);
              context.restore();
            }
          }
          if (this.strokeWidth > 0 && this.strokeColor !== 'none') {
            canvas.strokeRoundRect?.(
              this.left,
              this.top,
              this.right,
              this.bottom,
              typeof this.computeCorners === 'function' ? this.computeCorners() : (this.corners || [0, 0, 0, 0]),
              typeof this.getSeed === 'function' ? this.getSeed() : 1
            );
          }
        }
      };
    }

    if (DgmImage && DgmImage.prototype) {
      DgmImage.prototype.renderDefault = function (canvas: any) {
        const self = this as any;
        if (!self._imageDOM && self.imageData) {
          try {
            if (typeof (globalThis as any).Image === 'function') {
              self._imageDOM = new (globalThis as any).Image();
              self._imageDOM.src = self.imageData;
            } else if (typeof window !== 'undefined' && typeof window.Image === 'function') {
              self._imageDOM = new window.Image();
              self._imageDOM.src = self.imageData;
            } else {
              self._imageDOM = { src: self.imageData, complete: true, width: self.width, height: self.height };
            }
          } catch {
            self._imageDOM = { src: self.imageData, complete: true, width: self.width, height: self.height };
          }
        }
        const corners = typeof self.computeCorners === 'function' ? self.computeCorners() : (self.corners || [0, 0, 0, 0]);
        const opacity = typeof self.computeOpacity === 'function' ? self.computeOpacity() : (typeof self.opacity === 'number' ? self.opacity : 1);

        if (typeof canvas?.setAlpha === 'function') {
          canvas.setAlpha(opacity);
        } else if (canvas && 'alpha' in canvas) {
          canvas.alpha = opacity;
        }

        if (typeof canvas?.drawImage === 'function') {
          if (self._imageDOM) {
            try {
              canvas.drawImage(self._imageDOM, self.left, self.top, self.width, self.height, corners);
            } catch {
              // ignore
            }
          }
        } else if (canvas?.context) {
          const ctx = canvas.context;
          const x = self.left;
          const y = self.top;
          const w = self.width;
          const h = self.height;
          const hasCorners = Array.isArray(corners) ? corners.some((r: number) => r > 0) : corners > 0;

          ctx.save();
          ctx.globalAlpha = opacity;

          if (hasCorners) {
            const rs = Array.isArray(corners) ? corners : [corners, corners, corners, corners];
            ctx.beginPath();
            ctx.moveTo(x + rs[0], y);
            ctx.lineTo(x + w - rs[1], y);
            ctx.arcTo(x + w, y, x + w, y + rs[1], rs[1]);
            ctx.lineTo(x + w, y + h - rs[2]);
            ctx.arcTo(x + w, y + h, x + w - rs[2], y + h, rs[2]);
            ctx.lineTo(x + rs[3], y + h);
            ctx.arcTo(x, y + h, x, y + h - rs[3], rs[3]);
            ctx.lineTo(x, y + rs[0]);
            ctx.arcTo(x, y, x + rs[0], y, rs[0]);
            ctx.closePath();
            ctx.clip();
          }

          if (self._imageDOM) {
            try {
              ctx.drawImage(self._imageDOM, x, y, w, h);
            } catch {
              // ignore
            }
          }
          ctx.restore();
        }

        if (self.strokeWidth > 0 && self.strokeColor && self.strokeColor !== 'none' && self.strokeColor !== 'transparent' && self.strokeColor !== '$transparent') {
          if (typeof canvas?.strokeRoundRect === 'function') {
            canvas.strokeRoundRect(self.left, self.top, self.right, self.bottom, corners, typeof self.getSeed === 'function' ? self.getSeed() : 1);
          }
        }
      };
    }

    isScriptHookInstalled = true;
  }
};

// Initialize immediately upon import
setupScriptedShapeRendering();

// Helper to ensure all paragraph/heading/block nodes in TipTap doc or string are horizontally centered
export const ensureCenteredTextDoc = (text: any, horzAlign = 'center'): any => {
  if (text === null || text === undefined) {
    return text;
  }
  if (typeof text === 'string') {
    return {
      type: 'doc',
      content: text.split('\n').map((line) => ({
        type: 'paragraph',
        attrs: { textAlign: horzAlign },
        content: line ? [{ type: 'text', text: line }] : [],
      })),
    };
  }
  if (typeof text === 'object') {
    if (Array.isArray(text.content)) {
      const newContent = text.content.map((block: any) => {
        if (block && typeof block === 'object') {
          return {
            ...block,
            attrs: {
              ...(block.attrs || {}),
              textAlign: horzAlign,
            },
          };
        }
        return block;
      });
      return {
        ...text,
        type: text.type || 'doc',
        content: newContent,
      };
    }
  }
  return text;
};

// Proportional centered text helper for shapes with dynamic font reduction for long text
export const updateShapeTextProportions = (shape: any, editor?: Editor | null) => {
  if (!shape) return;

  const isFrame = shape.type === 'Frame' || shape._type === 'Frame' || Boolean(shape.isFrame);
  if (isFrame) {
    // Frames use header badges (name/title) and do not have centered body text unless explicitly provided as non-empty text content
    const hasExplicitText =
      typeof shape.text === 'string'
        ? shape.text.trim().length > 0
        : shape.text && typeof shape.text === 'object' && Array.isArray(shape.text.content) && shape.text.content.length > 0;
    if (!hasExplicitText) {
      shape.text = undefined;
      return;
    }
  }

  if (shape.customData?.fontFamily) {
    shape.fontFamily = shape.customData.fontFamily;
  } else if (!shape.fontFamily) {
    shape.fontFamily = 'Roboto';
  }

  shape.horzAlign = 'center';
  shape.vertAlign = 'middle';
  if (shape.text !== undefined && shape.text !== null) {
    shape.text = ensureCenteredTextDoc(shape.text, 'center');
  }

  if (typeof shape.customData?.fontSize === 'number' && shape.customData.fontSize > 0) {
    shape.fontSize = shape.customData.fontSize;
    return;
  }

  const w = shape.width ?? (shape.rect ? Math.abs(shape.rect[1][0] - shape.rect[0][0]) : 0);
  const h = shape.height ?? (shape.rect ? Math.abs(shape.rect[1][1] - shape.rect[0][1]) : 0);
  const minDim = Math.min(w, h);
  if (minDim > 0) {
    const baseFontSize = Math.max(12, Math.round(minDim * 0.2));
    shape.fontSize = baseFontSize;

    // Check if text is present and reduce font size if it exceeds the shape bounds
    let textStr = '';
    try {
      if (typeof shape.text === 'string') {
        textStr = shape.text;
      } else if (shape.text && typeof textUtils?.convertTextNodeToString === 'function') {
        textStr = textUtils.convertTextNodeToString(shape.text);
      }
    } catch {
      textStr = '';
    }
    textStr = textStr ? textStr.trim() : '';

    if (textStr.length > 0) {
      const activeCanvas = editor?.canvas;
      const availableWidth = Math.max(10, (shape.innerWidth ?? (w - 16)));
      const availableHeight = Math.max(10, (shape.innerHeight ?? (h - 16)));

      if (activeCanvas && typeof activeCanvas.textMetric === 'function' && typeof textUtils?.measureText === 'function') {
        try {
          let metric = textUtils.measureText(activeCanvas, shape, shape.text);
          while ((metric.width > availableWidth || metric.height > availableHeight) && shape.fontSize > 6) {
            shape.fontSize -= 1;
            metric = textUtils.measureText(activeCanvas, shape, shape.text);
          }
        } catch {
          // Fallback estimation if measureText fails
          const lines: string[] = textStr.split('\n');
          const maxLineLen = Math.max(...lines.map((l: string) => l.length), 1);
          while (
            (maxLineLen * shape.fontSize * 0.6 > availableWidth ||
              lines.length * shape.fontSize * 1.3 > availableHeight) &&
            shape.fontSize > 6
          ) {
            shape.fontSize -= 1;
          }
        }
      } else {
        // Fallback estimation if canvas is not yet initialized
        const lines: string[] = textStr.split('\n');
        const maxLineLen = Math.max(...lines.map((l: string) => l.length), 1);
        while (
          (maxLineLen * shape.fontSize * 0.6 > availableWidth ||
            lines.length * shape.fontSize * 1.3 > availableHeight) &&
          shape.fontSize > 6
        ) {
          shape.fontSize -= 1;
        }
      }
    }
  }
};

// Applies centered text formatting and alignment to all shapes in the editor
export const ensureAllShapesCentered = (editor?: Editor | null) => {
  if (!editor) return;
  const page = typeof (editor as any).getCurrentPage === 'function' 
    ? (editor as any).getCurrentPage() 
    : (editor as any).currentPage;
  if (!page) return;

  const applyRecursive = (shape: any) => {
    if (!shape) return;
    if (shape !== page) {
      updateShapeTextProportions(shape, editor);
    }
    if (Array.isArray(shape.children)) {
      shape.children.forEach(applyRecursive);
    }
  };

  const shapes = (page.children || []).filter((s: any) => s !== page);
  for (const shape of shapes) {
    applyRecursive(shape);
  }
};

// Automatically centers the whiteboard viewport on the content (shapes)
export const centerOnContent = (editor?: Editor | null) => {
  if (!editor) return;
  try {
    if (typeof editor.fit === 'function') {
      editor.fit();
    }
  } catch {}

  const page = typeof (editor as any).getCurrentPage === 'function' 
    ? (editor as any).getCurrentPage() 
    : (editor as any).currentPage;
  if (!page) return;

  const shapes = (page.children || []).filter((s: any) => s !== page);
  if (shapes.length > 0) {
    const minXs: number[] = [];
    const minYs: number[] = [];
    const maxXs: number[] = [];
    const maxYs: number[] = [];

    for (const shape of shapes) {
      if (typeof (shape as any).getBoundingRect === 'function') {
        const rect = (shape as any).getBoundingRect();
        if (rect && Array.isArray(rect) && rect.length >= 2 && rect[0] && rect[1]) {
          minXs.push(Math.min(rect[0][0], rect[1][0]));
          minYs.push(Math.min(rect[0][1], rect[1][1]));
          maxXs.push(Math.max(rect[0][0], rect[1][0]));
          maxYs.push(Math.max(rect[0][1], rect[1][1]));
        }
      } else if (typeof (shape as any).getCenter === 'function') {
        const c = (shape as any).getCenter();
        if (c && Array.isArray(c) && c.length >= 2) {
          minXs.push(c[0]);
          minYs.push(c[1]);
          maxXs.push(c[0]);
          maxYs.push(c[1]);
        }
      }
    }

    if (minXs.length > 0) {
      const minX = Math.min(...minXs);
      const minY = Math.min(...minYs);
      const maxX = Math.max(...maxXs);
      const maxY = Math.max(...maxYs);
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;

      editor.scrollCenterTo([centerX, centerY]);
      if (page) {
        page.pageOrigin = editor.getOrigin();
      }
      editor.repaint();
      return;
    }
  }

  // If no shapes exist, center on origin [0, 0]
  editor.scrollCenterTo([0, 0]);
  if (page) {
    page.pageOrigin = editor.getOrigin();
  }
  editor.repaint();
};

// Check whether a shape represents a group (live class instance, serialized object, or composite children)
export const isGroupShape = (shape: any): boolean => {
  if (!shape) return false;
  if (typeof Group !== 'undefined' && shape instanceof Group) return true;
  if (typeof Page !== 'undefined' && shape instanceof Page) return false;
  if (typeof Doc !== 'undefined' && shape instanceof Doc) return false;
  if (shape.constructor?.name === 'Group') return true;
  if (shape._type === 'Group' || shape.name === 'Group' || shape.type === 'Group') return true;
  if (
    shape._type === 'Page' ||
    shape.name === 'Page' ||
    shape.type === 'Page' ||
    shape.constructor?.name === 'Page' ||
    shape.constructor?.name === 'Page2' ||
    shape.constructor?.name === '_Page' ||
    shape._type === 'Doc' ||
    shape.name === 'Doc' ||
    shape.type === 'Doc' ||
    shape.constructor?.name === 'Doc' ||
    shape.constructor?.name === 'Doc3' ||
    shape.constructor?.name === '_Doc'
  ) {
    return false;
  }
  if (
    Array.isArray(shape.children) &&
    shape.children.length > 0 &&
    shape._type !== 'Page' &&
    shape.name !== 'Page' &&
    shape.type !== 'Page' &&
    shape._type !== 'Doc' &&
    shape.name !== 'Doc' &&
    shape.type !== 'Doc'
  ) {
    return true;
  }
  return false;
};

// Check whether a shape is an open line / connector / freehand / highlighter (excluding closed polygons such as triangles and rhombuses/diamonds)
export const isOpenLineShape = (shape: any): boolean => {
  if (!shape) return false;
  if (isGroupShape(shape)) return false;

  const type = shape._type || shape.name || shape.constructor?.name || shape.type;
  if (
    type === 'Box' ||
    type === 'Rectangle' ||
    type === 'Oval' ||
    type === 'Ellipse' ||
    type === 'Text' ||
    type === 'Image' ||
    type === 'Frame' ||
    type === 'Page' ||
    type === 'Doc'
  ) {
    return false;
  }

  // Check if live shape reports isClosed()
  if (typeof shape.isClosed === 'function' && shape.isClosed()) {
    return false;
  }
  if (shape.closed === true) {
    return false;
  }

  // Check path / points coordinates for closed loop (e.g. Triangle, Rhombus/Diamond, Polygon)
  const pts = Array.isArray(shape.path)
    ? shape.path
    : Array.isArray(shape.points)
    ? shape.points
    : null;

  if (pts && pts.length >= 3) {
    const first = pts[0];
    const last = pts[pts.length - 1];
    if (
      Array.isArray(first) &&
      Array.isArray(last) &&
      first.length >= 2 &&
      last.length >= 2 &&
      Math.hypot(first[0] - last[0], first[1] - last[1]) < 1
    ) {
      return false;
    }
  }

  // Must be a Line, Connector, Freehand, or Highlighter shape or have line ending properties
  const isLineOrConnector =
    type === 'Line' ||
    type === 'Connector' ||
    type === 'Freehand' ||
    type === 'Highlighter' ||
    'headEndType' in shape ||
    'tailEndType' in shape ||
    (Array.isArray(pts) && pts.length >= 2);

  return Boolean(isLineOrConnector);
};

// Check whether a shape or any shape in group is locked
export const isShapeLocked = (shape: any): boolean => {
  if (!shape) return false;
  return Boolean(shape.isLocked || shape.movable === 'none' || shape.sizable === 'none' || shape.rotatable === false);
};

// Lock or unlock shapes (and nested children for groups)
export const toggleShapeLock = (shapes: any[], forceState?: boolean): boolean => {
  if (!shapes || shapes.length === 0) return false;

  // If forceState is not provided, lock if any shape is unlocked, otherwise unlock
  const shouldLock = forceState !== undefined 
    ? forceState 
    : shapes.some((s) => !isShapeLocked(s));

  const applyLockRecursive = (shape: any) => {
    if (!shape) return;
    shape.isLocked = shouldLock;
    shape.movable = shouldLock ? 'none' : 'free';
    shape.sizable = shouldLock ? 'none' : 'free';
    shape.rotatable = !shouldLock;

    if (Array.isArray(shape.children)) {
      shape.children.forEach(applyLockRecursive);
    }
  };

  shapes.forEach(applyLockRecursive);
  return shouldLock;
};

// Rotate shapes by delta or set absolute degree
export const rotateShapes = (shapes: any[], angleDelta: number, setAbsolute = false, editor?: Editor | null): void => {
  if (!shapes || shapes.length === 0) return;

  shapes.forEach((shape) => {
    if (!shape) return;
    const current = Number(shape.rotate) || 0;
    const nextAngle = setAbsolute 
      ? (((angleDelta % 360) + 360) % 360)
      : ((((current + angleDelta) % 360) + 360) % 360);
    
    shape.rotate = nextAngle;
    if (editor && typeof shape.update === 'function') {
      try {
        shape.update(editor.canvas);
      } catch {}
    }
  });
};

// Apply color palette preset to shapes, groups, lines, freehand, connectors, and frames
export const applyColorToShapes = (shapes: any[], strokeColor: string, fillColor?: string): void => {
  if (!shapes || shapes.length === 0) return;

  const applyRecursive = (shape: any) => {
    if (!shape) return;
    shape.strokeColor = strokeColor;
    shape.fontColor = strokeColor;

    const isOpenLine = isOpenLineShape(shape);
    const isMarker = shape.type === 'Highlighter' || shape._type === 'Highlighter';
    
    if (fillColor && !isOpenLine && !isMarker && shape.fillColor !== undefined) {
      shape.fillColor = fillColor;
    }

    if (Array.isArray(shape.children)) {
      shape.children.forEach(applyRecursive);
    }
  };

  shapes.forEach(applyRecursive);
};

// Strip marks from TipTap / ProseMirror rich text doc
const clearMarksFromDoc = (node: any): any => {
  if (!node || typeof node !== 'object') return node;
  const newNode = { ...node };
  if ('marks' in newNode) {
    delete newNode.marks;
  }
  if (Array.isArray(newNode.content)) {
    newNode.content = newNode.content.map(clearMarksFromDoc);
  }
  return newNode;
};

// Text styling toggle (Bold, Italic, Clear)
export const applyTextStyling = (shapes: any[], style: 'bold' | 'italic' | 'clear'): void => {
  if (!shapes || shapes.length === 0) return;

  const applyRecursive = (shape: any) => {
    if (!shape) return;

    if (style === 'bold') {
      const isBold = shape.fontWeight === 700 || shape.fontWeight === '700' || shape.fontWeight === 'bold';
      shape.fontWeight = isBold ? 400 : 700;
    } else if (style === 'italic') {
      const isItalic = shape.fontStyle === 'italic';
      shape.fontStyle = isItalic ? 'normal' : 'italic';
    } else if (style === 'clear') {
      shape.fontWeight = 400;
      shape.fontStyle = 'normal';
      shape.fontFamily = 'Roboto';
      if (shape.text && typeof shape.text === 'object') {
        shape.text = clearMarksFromDoc(shape.text);
      }
    }

    if (Array.isArray(shape.children)) {
      shape.children.forEach(applyRecursive);
    }
  };

  shapes.forEach(applyRecursive);
};

// Configure arrowheads on line shapes
export const setLineArrows = (
  shapes: any[], 
  end: 'head' | 'tail', 
  type: 'flat' | 'arrow' | 'solid-arrow'
): void => {
  if (!shapes || shapes.length === 0) return;

  shapes.forEach((shape) => {
    if (!shape || !isOpenLineShape(shape)) return;
    if (end === 'head') {
      shape.headEndType = type;
    } else if (end === 'tail') {
      shape.tailEndType = type;
    }
  });
};

// Calculate proportional bounds for an image constrained within max bounding limits
export const calculateImageDimensions = (
  naturalWidth: number,
  naturalHeight: number,
  maxWidth = 400,
  maxHeight = 400
): { width: number; height: number } => {
  if (!naturalWidth || !naturalHeight || naturalWidth <= 0 || naturalHeight <= 0) {
    return { width: maxWidth, height: maxHeight };
  }
  const aspectRatio = naturalWidth / naturalHeight;
  let width = naturalWidth;
  let height = naturalHeight;

  if (width > maxWidth) {
    width = maxWidth;
    height = width / aspectRatio;
  }
  if (height > maxHeight) {
    height = maxHeight;
    width = height * aspectRatio;
  }
  return { width: Math.round(width), height: Math.round(height) };
};

// Construct an Image shape on the canvas with proportional sizing and ratio constraints
export const createImageShape = (
  editor: Editor,
  imageUrl: string,
  width: number,
  height: number,
  position?: [number, number]
): any => {
  const center = position || editor.getCenter();
  const halfW = width / 2;
  const halfH = height / 2;
  const left = center[0] - halfW;
  const top = center[1] - halfH;

  let shape: any;
  if (DgmImage) {
    shape = new DgmImage();
    shape.left = left;
    shape.top = top;
    shape.width = width;
    shape.height = height;
    shape.rect = [
      [left, top],
      [left + width, top + height],
    ];
    if (editor?.factory?.onShapeInitialize?.emit) {
      editor.factory.onShapeInitialize.emit(shape);
    }
  } else if (typeof (editor?.factory as any)?.createRectangle === 'function') {
    const rect: [[number, number], [number, number]] = [
      [left, top],
      [left + width, top + height],
    ];
    shape = editor.factory.createRectangle(rect);
    shape.type = 'Image';
    shape._type = 'Image';
  } else {
    shape = {
      type: 'Image',
      left,
      top,
      width,
      height,
      rect: [
        [left, top],
        [left + width, top + height],
      ],
    };
  }

  shape.imageData = imageUrl;
  shape.imageWidth = width;
  shape.imageHeight = height;
  shape.sizable = typeof Sizable !== 'undefined' && Sizable.RATIO ? Sizable.RATIO : 'ratio';
  shape.movable = 'free';
  shape.rotatable = true;
  shape.containable = false;

  return shape;
};

/**
 * Serializes the editor document tree to JSON while preserving shape-level `customData`
 * (such as dot-votes) and document-level `customData` (such as voting configuration).
 */
export const serializeDocWithCustomData = (
  editor: Editor | null | undefined,
  rootCustomData?: Record<string, any>
): any => {
  if (!editor) return null;
  const anyEditor = editor as any;
  const docJson = typeof editor.saveToJSON === 'function'
    ? editor.saveToJSON()
    : (anyEditor.doc && typeof anyEditor.doc.toJSON === 'function' ? anyEditor.doc.toJSON(true) : null);

  if (!docJson) return docJson;

  const storeIdIndex = (editor.store as any)?.idIndex || {};

  // Attach root customData
  const docCustomData = {
    ...(anyEditor.doc?.customData || {}),
    ...(docJson.customData || {}),
    ...(rootCustomData || {}),
  };
  if (Object.keys(docCustomData).length > 0) {
    docJson.customData = JSON.parse(JSON.stringify(docCustomData));
  }

  // Recursively enrich each shape node with customData, script, and properties from the in-memory store
  const enrichNode = (node: any) => {
    if (!node) return;
    if (node.id) {
      const memoryObj = storeIdIndex[node.id] || (typeof anyEditor.findObj === 'function' ? anyEditor.findObj(node.id) : null);
      if (memoryObj) {
        if (memoryObj.type && memoryObj.type !== 'Shape') {
          node.type = memoryObj.type;
        }
        if (memoryObj.customData) {
          node.customData = JSON.parse(JSON.stringify(memoryObj.customData));
        }
        if (memoryObj.script !== undefined) {
          node.script = typeof memoryObj.script === 'function' ? memoryObj.script.toString() : memoryObj.script;
          node.customData = { ...(node.customData || {}), script: node.script };
        }
        if (memoryObj.defaultScript !== undefined) {
          node.defaultScript = typeof memoryObj.defaultScript === 'function' ? memoryObj.defaultScript.toString() : memoryObj.defaultScript;
          node.customData = { ...(node.customData || {}), defaultScript: node.defaultScript };
        }
        if (memoryObj.properties !== undefined) {
          try {
            node.properties = JSON.parse(JSON.stringify(memoryObj.properties));
          } catch {
            node.properties = { ...memoryObj.properties };
          }
          node.customData = { ...(node.customData || {}), properties: node.properties };
        }
      }
    }
    if (Array.isArray(node.children)) {
      node.children.forEach(enrichNode);
    }
  };

  enrichNode(docJson);
  return docJson;
};

/**
 * Restores shape-level and document-level `customData`, `script`, and `properties` onto in-memory DGM objects
 * following an `editor.loadFromJSON` or remote JSON payload load.
 */
export const restoreDocCustomData = (
  editor: Editor | null | undefined,
  content: any
): void => {
  if (!editor || !content) return;
  const anyEditor = editor as any;

  // Restore doc-level customData
  if (content.customData && anyEditor.doc) {
    anyEditor.doc.customData = JSON.parse(JSON.stringify(content.customData));
  }

  const storeIdIndex = (editor.store as any)?.idIndex || {};

  const restoreNode = (node: any) => {
    if (!node) return;
    if (node.id) {
      const memoryObj = storeIdIndex[node.id] || (typeof anyEditor.findObj === 'function' ? anyEditor.findObj(node.id) : null);
      if (memoryObj) {
        if (node.type && node.type !== 'Shape') {
          memoryObj.type = node.type;
        }
        if (node.customData) {
          memoryObj.customData = JSON.parse(JSON.stringify(node.customData));
        }
        if (node.script !== undefined || node.customData?.script !== undefined) {
          memoryObj.script = node.script ?? node.customData?.script;
          memoryObj.customData = { ...(memoryObj.customData || {}), script: memoryObj.script };
        }
        if (node.defaultScript !== undefined || node.customData?.defaultScript !== undefined) {
          memoryObj.defaultScript = node.defaultScript ?? node.customData?.defaultScript;
          memoryObj.customData = { ...(memoryObj.customData || {}), defaultScript: memoryObj.defaultScript };
        }
        if (node.properties || node.customData?.properties) {
          try {
            memoryObj.properties = JSON.parse(JSON.stringify(node.properties || node.customData?.properties));
          } catch {
            memoryObj.properties = { ...(node.properties || node.customData?.properties) };
          }
          memoryObj.customData = { ...(memoryObj.customData || {}), properties: memoryObj.properties };
        }
      }
    }
    if (Array.isArray(node.children)) {
      node.children.forEach(restoreNode);
    }
  };

  restoreNode(content);
};

/**
 * Normalizes an array of shapes into relative coordinates based on the selection's top-left origin.
 */
export const serializeShapesToStencil = (
  shapes: any[]
): { shapesJson: string; width: number; height: number; shapes: any[] } => {
  if (!shapes || shapes.length === 0) {
    return { shapesJson: '[]', width: 0, height: 0, shapes: [] };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  shapes.forEach((s) => {
    const left = s.left ?? (s.rect ? Math.min(s.rect[0][0], s.rect[1][0]) : 0);
    const top = s.top ?? (s.rect ? Math.min(s.rect[0][1], s.rect[1][1]) : 0);
    const w = s.width ?? (s.rect ? Math.abs(s.rect[1][0] - s.rect[0][0]) : 100);
    const h = s.height ?? (s.rect ? Math.abs(s.rect[1][1] - s.rect[0][1]) : 60);

    minX = Math.min(minX, left);
    minY = Math.min(minY, top);
    maxX = Math.max(maxX, left + w);
    maxY = Math.max(maxY, top + h);
  });

  if (!isFinite(minX)) minX = 0;
  if (!isFinite(minY)) minY = 0;
  if (!isFinite(maxX)) maxX = 100;
  if (!isFinite(maxY)) maxY = 60;

  const width = Math.max(10, maxX - minX);
  const height = Math.max(10, maxY - minY);

  const normalizedShapes = shapes.map((s) => {
    let raw: any;
    try {
      raw = typeof s.toJSON === 'function' ? s.toJSON(true) : JSON.parse(JSON.stringify(s));
    } catch {
      raw = { ...s };
    }

    // Capture and preserve script, properties, and custom draw parameters if not in raw
    if (s.script !== undefined && raw.script === undefined) {
      raw.script = typeof s.script === 'function' ? s.script.toString() : s.script;
    } else if (typeof raw.script === 'function') {
      raw.script = raw.script.toString();
    }
    if (s.defaultScript !== undefined && raw.defaultScript === undefined) {
      raw.defaultScript = typeof s.defaultScript === 'function' ? s.defaultScript.toString() : s.defaultScript;
    } else if (typeof raw.defaultScript === 'function') {
      raw.defaultScript = raw.defaultScript.toString();
    }
    if (s.properties !== undefined && raw.properties === undefined) {
      try {
        raw.properties = JSON.parse(JSON.stringify(s.properties));
      } catch {
        raw.properties = { ...s.properties };
      }
    }
    if (s.customData !== undefined && raw.customData === undefined) {
      try {
        raw.customData = JSON.parse(JSON.stringify(s.customData));
      } catch {
        raw.customData = { ...s.customData };
      }
    }
    if (s.fillColor !== undefined && raw.fillColor === undefined) raw.fillColor = s.fillColor;
    if (s.strokeColor !== undefined && raw.strokeColor === undefined) raw.strokeColor = s.strokeColor;
    if (s.strokeWidth !== undefined && raw.strokeWidth === undefined) raw.strokeWidth = s.strokeWidth;
    if (s.text !== undefined && raw.text === undefined) raw.text = s.text;
    if (s.fontColor !== undefined && raw.fontColor === undefined) raw.fontColor = s.fontColor;
    if (s.fontSize !== undefined && raw.fontSize === undefined) raw.fontSize = s.fontSize;
    if (s.fontFamily !== undefined && raw.fontFamily === undefined) raw.fontFamily = s.fontFamily;

    const left = raw.left ?? (raw.rect ? Math.min(raw.rect[0][0], raw.rect[1][0]) : (s.left ?? (s.rect ? Math.min(s.rect[0][0], s.rect[1][0]) : 0)));
    const top = raw.top ?? (raw.rect ? Math.min(raw.rect[0][1], raw.rect[1][1]) : (s.top ?? (s.rect ? Math.min(s.rect[0][1], s.rect[1][1]) : 0)));
    const w = raw.width ?? (raw.rect ? Math.abs(raw.rect[1][0] - raw.rect[0][0]) : (s.width ?? 100));
    const h = raw.height ?? (raw.rect ? Math.abs(raw.rect[1][1] - raw.rect[0][1]) : (s.height ?? 60));

    const relLeft = left - minX;
    const relTop = top - minY;

    return {
      ...raw,
      left: relLeft,
      top: relTop,
      width: w,
      height: h,
      rect: raw.rect ? [
        [relLeft, relTop],
        [relLeft + w, relTop + h],
      ] : undefined,
    };
  });

  return {
    shapesJson: JSON.stringify(normalizedShapes),
    width,
    height,
    shapes: normalizedShapes,
  };
};

/**
 * Instantiates a stencil's shapes at a target global canvas coordinate, remapping IDs to fresh UUIDs.
 */
export const instantiateStencilShapes = (
  stencilShapes: any[],
  targetX: number,
  targetY: number
): any[] => {
  if (!stencilShapes || !Array.isArray(stencilShapes) || stencilShapes.length === 0) {
    return [];
  }

  const idMap: Record<string, string> = {};
  stencilShapes.forEach((s) => {
    if (s.id) {
      idMap[s.id] = (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : `shape-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    }
  });

  return stencilShapes.map((s) => {
    let clone: any;
    try {
      clone = JSON.parse(JSON.stringify(s));
    } catch {
      clone = { ...s };
    }

    // Preserve execution scripts (functions or strings), default scripts, properties, and custom data
    if (s.script !== undefined && clone.script === undefined) {
      clone.script = s.script;
    }
    if (s.defaultScript !== undefined && clone.defaultScript === undefined) {
      clone.defaultScript = s.defaultScript;
    }
    if (s.properties !== undefined && clone.properties === undefined) {
      try {
        clone.properties = JSON.parse(JSON.stringify(s.properties));
      } catch {
        clone.properties = { ...s.properties };
      }
    }
    if (s.customData !== undefined && clone.customData === undefined) {
      try {
        clone.customData = JSON.parse(JSON.stringify(s.customData));
      } catch {
        clone.customData = { ...s.customData };
      }
    }

    const newId = (s.id && idMap[s.id])
      ? idMap[s.id]
      : ((typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `shape-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
    const relLeft = clone.left ?? (clone.rect ? Math.min(clone.rect[0][0], clone.rect[1][0]) : 0);
    const relTop = clone.top ?? (clone.rect ? Math.min(clone.rect[0][1], clone.rect[1][1]) : 0);
    const w = clone.width ?? (clone.rect ? Math.abs(clone.rect[1][0] - clone.rect[0][0]) : 100);
    const h = clone.height ?? (clone.rect ? Math.abs(clone.rect[1][1] - clone.rect[0][1]) : 60);

    const posX = targetX + relLeft;
    const posY = targetY + relTop;

    const result: any = {
      ...clone,
      id: newId,
      left: posX,
      top: posY,
      width: w,
      height: h,
    };

    if (clone.rect) {
      result.rect = [
        [posX, posY],
        [posX + w, posY + h],
      ];
    }

    if (clone.tail && idMap[clone.tail]) {
      result.tail = idMap[clone.tail];
    }
    if (clone.head && idMap[clone.head]) {
      result.head = idMap[clone.head];
    }

    return result;
  });
};

export {
  resolveDgmColor,
  extractShapeTextLines,
  extractImageDataUrl,
  serializeDgmToSvg,
  generatePdfDocument,
  exportWhiteboardToSVG,
  exportWhiteboardToPNG,
  exportWhiteboardToPDF,
  downloadBlob,
  calculateShapesBoundingBox,
} from './exportUtils';
