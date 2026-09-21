import { Shape, Rectangle, Frame, Image as DgmImage, shapeInstantiator, manipulatorManager } from '@dgmjs/core';
import { isOpenLineShape } from './shapeClassification';

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
  const isEllipse = shape.type === 'Ellipse' || shape._type === 'Ellipse' || shape.name === 'Ellipse' || shape.type === 'Oval' || shape._type === 'Oval' || shape.name === 'Oval';

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

// Header badge
ctx.fillStyle = shape.strokeColor || '${strokeColor}';
ctx.font = 'bold 12px Roboto, sans-serif';
ctx.fillText(title, 12, 20);

ctx.restore();`;
  }

  if (isImage) {
    return `// Canvas2D Custom Image Script
// ctx: CanvasRenderingContext2D (draws at local 0,0)
// shape: shape properties, dimensions, and image metadata
const w = shape.width || 200;
const h = shape.height || 200;

ctx.save();
// Outer frame / shadow
ctx.fillStyle = shape.fillColor || '${fillColor}';
ctx.strokeStyle = shape.strokeColor || '${strokeColor}';
ctx.lineWidth = shape.strokeWidth || ${strokeWidth};
ctx.beginPath();
ctx.roundRect(0, 0, w, h, 6);
ctx.fill();
ctx.stroke();

if (shape._imageDOM && shape._imageDOM.complete) {
  ctx.drawImage(shape._imageDOM, 0, 0, w, h);
} else {
  // Image placeholder icon or preview frame
  ctx.fillStyle = '#64748b';
  ctx.font = 'bold 12px Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🖼️ Custom Image Component', w / 2, h / 2);
}

ctx.restore();`;
  }

  if (isEllipse) {
    return `// Canvas2D Custom Ellipse Script
// ctx: CanvasRenderingContext2D (draws at local 0,0)
// shape: shape properties, dimensions, and styling
const w = shape.width;
const h = shape.height;
const rx = w / 2;
const ry = h / 2;

ctx.save();
ctx.fillStyle = shape.fillColor || '${fillColor}';
ctx.strokeStyle = shape.strokeColor || '${strokeColor}';
ctx.lineWidth = shape.strokeWidth || ${strokeWidth};

ctx.beginPath();
ctx.ellipse(rx, ry, rx, ry, 0, 0, 2 * Math.PI);
ctx.fill();
ctx.stroke();

ctx.restore();`;
  }

  // Generic 2D shape starter script
  return `// Canvas2D Custom Drawing Script
// ctx: CanvasRenderingContext2D (draws at local 0,0)
// shape: shape properties, customData, and dimensions
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
