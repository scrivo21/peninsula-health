import React, { useState, useEffect, useCallback } from 'react';
import styles from './JsonEditor.module.css';

interface JsonEditorProps {
  data: any;
  onChange: (newData: any) => void;
  sectionType: string;
}

interface ValidationError {
  path: string;
  message: string;
}

export const JsonEditor: React.FC<JsonEditorProps> = ({ data, onChange, sectionType }) => {
  const [jsonText, setJsonText] = useState('');
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Initialize JSON text from data
  useEffect(() => {
    try {
      setJsonText(JSON.stringify(data, null, 2));
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Failed to serialize data:', error);
      setJsonText('{}');
    }
  }, [data]);

  // Validation schemas for different section types
  const validateData = useCallback((parsedData: any): ValidationError[] => {
    const errors: ValidationError[] = [];

    try {
      switch (sectionType) {
        case 'shifts.clinical_shifts':
        case 'shifts.non_clinical_shifts':
          if (!Array.isArray(parsedData)) {
            errors.push({ path: 'root', message: 'Must be an array of shift objects' });
            break;
          }
          
          parsedData.forEach((shift, index) => {
            if (typeof shift !== 'object' || shift === null) {
              errors.push({ path: `[${index}]`, message: 'Each shift must be an object' });
              return;
            }
            
            // Required fields
            const requiredFields = ['location', 'type', 'time', 'start_time', 'end_time', 'duration_hours'];
            requiredFields.forEach(field => {
              if (!(field in shift)) {
                errors.push({ path: `[${index}].${field}`, message: `Missing required field: ${field}` });
              }
            });
            
            // Validate specific field types
            if ('duration_hours' in shift && (typeof shift.duration_hours !== 'number' || shift.duration_hours <= 0)) {
              errors.push({ path: `[${index}].duration_hours`, message: 'Duration must be a positive number' });
            }
            
            if ('weighting' in shift && typeof shift.weighting !== 'number') {
              errors.push({ path: `[${index}].weighting`, message: 'Weighting must be a number' });
            }
            
            if ('is_leadership' in shift && typeof shift.is_leadership !== 'boolean') {
              errors.push({ path: `[${index}].is_leadership`, message: 'is_leadership must be true or false' });
            }
            
            // Validate time format (HH:MM)
            const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
            if ('start_time' in shift && !timeRegex.test(shift.start_time)) {
              errors.push({ path: `[${index}].start_time`, message: 'Start time must be in HH:MM format' });
            }
            
            if ('end_time' in shift && !timeRegex.test(shift.end_time)) {
              errors.push({ path: `[${index}].end_time`, message: 'End time must be in HH:MM format' });
            }
          });
          break;
          
        case 'shift_penalties':
          if (typeof parsedData !== 'object' || Array.isArray(parsedData)) {
            errors.push({ path: 'root', message: 'Must be an object with penalty values' });
            break;
          }
          
          Object.entries(parsedData).forEach(([key, value]) => {
            if (key.startsWith('_')) return; // Skip documentation fields
            
            if (typeof value !== 'number') {
              errors.push({ path: key, message: `${key} must be a number` });
            } else if (value < 0) {
              errors.push({ path: key, message: `${key} cannot be negative` });
            }
          });
          break;
          
        case 'medical_quotes_and_facts.quotes':
          if (!Array.isArray(parsedData)) {
            errors.push({ path: 'root', message: 'Must be an array of strings' });
            break;
          }
          
          parsedData.forEach((quote, index) => {
            if (typeof quote !== 'string') {
              errors.push({ path: `[${index}]`, message: 'Each quote must be a string' });
            } else if (quote.trim().length === 0) {
              errors.push({ path: `[${index}]`, message: 'Quote cannot be empty' });
            }
          });
          break;
          
        default:
          // Generic validation
          if (parsedData === undefined || parsedData === null) {
            errors.push({ path: 'root', message: 'Data cannot be null or undefined' });
          }
      }
    } catch (error) {
      errors.push({ path: 'validation', message: `Validation error: ${error}` });
    }

    return errors;
  }, [sectionType]);

  const handleTextChange = (newText: string) => {
    setJsonText(newText);
    setHasUnsavedChanges(true);
    
    // Real-time validation
    try {
      const parsed = JSON.parse(newText);
      const errors = validateData(parsed);
      setValidationErrors(errors);
    } catch (error) {
      setValidationErrors([{ path: 'json', message: 'Invalid JSON syntax' }]);
    }
  };

  const handleSave = () => {
    try {
      const parsed = JSON.parse(jsonText);
      const errors = validateData(parsed);
      
      if (errors.length > 0) {
        setValidationErrors(errors);
        return;
      }
      
      onChange(parsed);
      setIsEditing(false);
      setHasUnsavedChanges(false);
      setValidationErrors([]);
    } catch (error) {
      setValidationErrors([{ path: 'json', message: 'Invalid JSON syntax' }]);
    }
  };

  const handleCancel = () => {
    setJsonText(JSON.stringify(data, null, 2));
    setIsEditing(false);
    setHasUnsavedChanges(false);
    setValidationErrors([]);
  };

  const addNewItem = () => {
    try {
      let newItem: any;
      
      switch (sectionType) {
        case 'shifts.clinical_shifts':
        case 'shifts.non_clinical_shifts':
          newItem = {
            location: "Frankston",
            type: "New Shift",
            time: "AM",
            start_time: "08:00",
            end_time: "18:00",
            duration_hours: 10,
            weighting: 0,
            is_leadership: false,
            requires_experience: false,
            description: "New shift description"
          };
          break;
          
        case 'medical_quotes_and_facts.quotes':
          newItem = "New medical quote or fact";
          break;
          
        default:
          return;
      }
      
      const currentData = JSON.parse(jsonText);
      
      if (Array.isArray(currentData)) {
        currentData.push(newItem);
      } else if (typeof currentData === 'object') {
        currentData[`new_item_${Date.now()}`] = newItem;
      }
      
      setJsonText(JSON.stringify(currentData, null, 2));
      setHasUnsavedChanges(true);
      setIsEditing(true);
    } catch (error) {
      console.error('Failed to add new item:', error);
    }
  };

  const formatJson = () => {
    try {
      const parsed = JSON.parse(jsonText);
      setJsonText(JSON.stringify(parsed, null, 2));
    } catch (error) {
      // Invalid JSON, don't format
    }
  };

  const getItemCount = () => {
    try {
      const parsed = JSON.parse(jsonText);
      if (Array.isArray(parsed)) {
        return `${parsed.length} items`;
      } else if (typeof parsed === 'object' && parsed !== null) {
        return `${Object.keys(parsed).length} properties`;
      }
      return '';
    } catch {
      return '';
    }
  };

  return (
    <div className={styles.jsonEditor}>
      {/* Editor Header */}
      <div className={styles.editorHeader}>
        <div className={styles.editorInfo}>
          <span className={styles.itemCount}>{getItemCount()}</span>
          {hasUnsavedChanges && (
            <span className={styles.unsavedIndicator}>• Unsaved changes</span>
          )}
        </div>
        
        <div className={styles.editorControls}>
          {(sectionType.includes('shifts') || sectionType.includes('quotes')) && (
            <button
              className={styles.addButton}
              onClick={addNewItem}
              title="Add new item"
            >
              ➕ Add Item
            </button>
          )}
          
          <button
            className={styles.formatButton}
            onClick={formatJson}
            title="Format JSON"
          >
            🎨 Format
          </button>
          
          {!isEditing ? (
            <button
              className={styles.editButton}
              onClick={() => setIsEditing(true)}
            >
              ✏️ Edit
            </button>
          ) : (
            <div className={styles.editActions}>
              <button
                className={styles.saveButton}
                onClick={handleSave}
                disabled={validationErrors.length > 0}
              >
                💾 Save
              </button>
              <button
                className={styles.cancelButton}
                onClick={handleCancel}
              >
                ❌ Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className={styles.validationErrors}>
          <h4 className={styles.errorsTitle}>❌ Validation Errors:</h4>
          <ul className={styles.errorsList}>
            {validationErrors.map((error, index) => (
              <li key={index} className={styles.errorItem}>
                <strong>{error.path}:</strong> {error.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* JSON Editor */}
      <div className={styles.editorContainer}>
        <textarea
          value={jsonText}
          onChange={(e) => handleTextChange(e.target.value)}
          className={`${styles.jsonTextarea} ${validationErrors.length > 0 ? styles.hasErrors : ''}`}
          disabled={!isEditing}
          placeholder="JSON data will appear here..."
          spellCheck={false}
        />
      </div>
      
      {/* Editor Footer */}
      <div className={styles.editorFooter}>
        <div className={styles.editorStatus}>
          {validationErrors.length > 0 ? (
            <span className={styles.statusError}>
              {validationErrors.length} error{validationErrors.length !== 1 ? 's' : ''}
            </span>
          ) : (
            <span className={styles.statusValid}>✓ Valid JSON</span>
          )}
        </div>
        
        <div className={styles.editorHints}>
          <span className={styles.hint}>
            {isEditing ? 'Press Save to apply changes' : 'Click Edit to modify the data'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default JsonEditor;