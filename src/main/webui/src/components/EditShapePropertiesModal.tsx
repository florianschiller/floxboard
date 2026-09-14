import React, { useState, useEffect } from 'react';
import {
  X,
  Sliders,
  Plus,
  Trash2,
  Check,
  Tag,
  AlertCircle,
} from 'lucide-react';

export interface EditShapePropertiesModalProps {
  isOpen: boolean;
  onClose: () => void;
  shape: any | null;
  onSave?: (updatedProperties: Record<string, any>) => void;
}

interface PropertyItem {
  key: string;
  value: any;
  type: 'string' | 'number' | 'boolean' | 'array';
  isCustom?: boolean;
}

const PROPERTY_LABELS: Record<string, { label: string; placeholder?: string; description?: string }> = {
  className: { label: 'Class Name', placeholder: 'e.g. OrderService', description: 'UML identifier' },
  stereotype: { label: 'Stereotype', placeholder: 'e.g. <<Service>>', description: 'type tag' },
  attributes: { label: 'Attributes', placeholder: '- id: UUID\n- name: String', description: 'one per line' },
  methods: { label: 'Methods', placeholder: '+ execute(): void\n+ cancel(): Boolean', description: 'one per line' },
  code: { label: 'Story Code', placeholder: 'e.g. US-101', description: 'Agile ID' },
  title: { label: 'Title', placeholder: 'Enter title...' },
  subtitle: { label: 'Subtitle', placeholder: 'Enter subtitle...' },
  persona: { label: 'As a (Persona)', placeholder: 'e.g. Registered Customer' },
  goal: { label: 'I want to (Goal)', placeholder: 'e.g. View invoice history' },
  points: { label: 'Story Points', placeholder: 'e.g. 5' },
  priority: { label: 'Priority', placeholder: 'e.g. HIGH, MEDIUM, LOW' },
  label: { label: 'Label', placeholder: 'Enter label text...' },
  status: { label: 'Status', placeholder: 'e.g. ONLINE, PENDING, ACTIVE' },
  checked: { label: 'Checked / Active', description: 'Toggle state' },
  progress: { label: 'Progress (%)', placeholder: '0 - 100' },
  placeholder: { label: 'Placeholder Text', placeholder: 'e.g. Search stencils...' },
  eventType: { label: 'BPMN Event Type', placeholder: 'START, INTERMEDIATE, END' },
  gatewayType: { label: 'BPMN Gateway Type', placeholder: 'EXCLUSIVE, PARALLEL, INCLUSIVE' },
  level: { label: 'Mood Level (1 - 5)', placeholder: '1 to 5' },
};

export function EditShapePropertiesModal({
  isOpen,
  onClose,
  shape,
  onSave,
}: EditShapePropertiesModalProps) {
  const [properties, setProperties] = useState<PropertyItem[]>([]);
  const [newKey, setNewKey] = useState('');
  const [newType, setNewType] = useState<'string' | 'number' | 'boolean' | 'array'>('string');
  const [newValue, setNewValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && shape) {
      setError(null);
      setNewKey('');
      setNewValue('');
      setNewType('string');

      const initialProps = shape.properties || {};
      const items: PropertyItem[] = Object.entries(initialProps).map(([key, val]) => {
        let type: 'string' | 'number' | 'boolean' | 'array' = 'string';
        let value = val;

        if (Array.isArray(val)) {
          type = 'array';
          value = val.join('\n');
        } else if (typeof val === 'number') {
          type = 'number';
          value = val;
        } else if (typeof val === 'boolean') {
          type = 'boolean';
          value = val;
        } else {
          type = 'string';
          value = String(val ?? '');
        }

        return {
          key,
          value,
          type,
          isCustom: !(key in PROPERTY_LABELS),
        };
      });

      setProperties(items);
    }
  }, [isOpen, shape]);

  if (!isOpen || !shape) return null;

  const handlePropertyChange = (index: number, val: any) => {
    setProperties((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], value: val };
      return updated;
    });
  };

  const handleRemoveProperty = (index: number) => {
    setProperties((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddProperty = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedKey = newKey.trim();
    if (!trimmedKey) {
      setError('Please provide a property key name.');
      return;
    }

    if (properties.some((p) => p.key.toLowerCase() === trimmedKey.toLowerCase())) {
      setError(`Property "${trimmedKey}" already exists.`);
      return;
    }

    let parsedVal: any = newValue;
    if (newType === 'number') {
      parsedVal = Number(newValue) || 0;
    } else if (newType === 'boolean') {
      parsedVal = newValue === 'true' || newValue === '1';
    } else if (newType === 'array') {
      parsedVal = newValue;
    }

    setProperties((prev) => [
      ...prev,
      {
        key: trimmedKey,
        value: parsedVal,
        type: newType,
        isCustom: !(trimmedKey in PROPERTY_LABELS),
      },
    ]);

    setNewKey('');
    setNewValue('');
    setNewType('string');
    setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const result: Record<string, any> = {};

    for (const item of properties) {
      if (item.type === 'number') {
        const trimmed = String(item.value).trim();
        const num = Number(trimmed);
        if (trimmed === '' || isNaN(num)) {
          setError(`Invalid numeric value for property "${item.key}".`);
          return;
        }
        result[item.key] = num;
      } else if (item.type === 'boolean') {
        result[item.key] = Boolean(item.value);
      } else if (item.type === 'array') {
        if (typeof item.value === 'string') {
          result[item.key] = item.value
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => line.length > 0);
        } else if (Array.isArray(item.value)) {
          result[item.key] = item.value;
        } else {
          result[item.key] = [];
        }
      } else {
        result[item.key] = item.value !== undefined && item.value !== null ? String(item.value) : '';
      }
    }

    if (shape) {
      shape.properties = result;
    }

    if (onSave) {
      onSave(result);
    }

    onClose();
  };

  const shapeTitle = shape.properties?.className ||
    shape.properties?.title ||
    shape.properties?.label ||
    shape.properties?.code ||
    shape.name ||
    shape.type ||
    'Custom Stencil';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-properties-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4"
    >
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-slate-900 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 id="edit-properties-title" className="text-sm font-bold text-slate-900">
                Edit Shape Properties
              </h3>
              <p className="text-xs text-slate-500 truncate max-w-[280px]">
                {shapeTitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {properties.length === 0 ? (
            <div className="text-center py-6 px-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <Tag className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-medium text-slate-600">No properties defined yet</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Add custom parametric attributes below to customize this shape.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {properties.map((prop, index) => {
                const meta = PROPERTY_LABELS[prop.key];
                const displayLabel = meta?.label || prop.key;
                const placeholder = meta?.placeholder || `Enter ${prop.key}...`;

                return (
                  <div
                    key={`${prop.key}-${index}`}
                    className="p-3.5 bg-slate-50/70 hover:bg-slate-50 border border-slate-200/80 rounded-xl transition-colors space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor={`prop-input-${prop.key}`}
                        className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>{displayLabel}</span>
                        {meta?.description && (
                          <span className="text-[10px] font-normal text-slate-400">
                            ({meta.description})
                          </span>
                        )}
                        {prop.isCustom && (
                          <span className="px-1.5 py-0.5 bg-slate-200/60 text-slate-600 rounded text-[9px] font-mono font-normal">
                            custom
                          </span>
                        )}
                      </label>
                      <button
                        type="button"
                        onClick={() => handleRemoveProperty(index)}
                        className="text-slate-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors cursor-pointer"
                        title="Remove property"
                        aria-label={`Remove property ${prop.key}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {prop.type === 'boolean' ? (
                      <div className="flex items-center gap-2 pt-1">
                        <input
                          id={`prop-input-${prop.key}`}
                          aria-label={displayLabel}
                          type="checkbox"
                          checked={Boolean(prop.value)}
                          onChange={(e) => handlePropertyChange(index, e.target.checked)}
                          className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                        />
                        <span className="text-xs text-slate-600 select-none">
                          {Boolean(prop.value) ? 'Enabled / True' : 'Disabled / False'}
                        </span>
                      </div>
                    ) : prop.type === 'array' ? (
                      <textarea
                        id={`prop-input-${prop.key}`}
                        aria-label={displayLabel}
                        rows={3}
                        value={prop.value}
                        onChange={(e) => handlePropertyChange(index, e.target.value)}
                        placeholder={placeholder}
                        className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all resize-y"
                      />
                    ) : prop.type === 'number' ? (
                      <input
                        id={`prop-input-${prop.key}`}
                        aria-label={displayLabel}
                        type="text"
                        inputMode="numeric"
                        value={prop.value}
                        onChange={(e) => handlePropertyChange(index, e.target.value)}
                        placeholder={placeholder}
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                      />
                    ) : (
                      <input
                        id={`prop-input-${prop.key}`}
                        aria-label={displayLabel}
                        type="text"
                        value={prop.value}
                        onChange={(e) => handlePropertyChange(index, e.target.value)}
                        placeholder={placeholder}
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Add Custom Property Form */}
          <div className="pt-2 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-blue-600" />
              <span>Add Custom Property</span>
            </h4>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                placeholder="Key name (e.g. region)"
                className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
              />
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as any)}
                className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="string">Text</option>
                <option value="number">Number</option>
                <option value="boolean">Boolean</option>
                <option value="array">List (Lines)</option>
              </select>
              <button
                type="button"
                onClick={handleAddProperty}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Apply Changes</span>
          </button>
        </div>
      </div>
    </div>
  );
}
