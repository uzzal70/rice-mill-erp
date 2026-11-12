export interface PrerequisiteConfig {
  /** True when the prerequisite field(s) have valid values; false locks this field with clear user guidance. */
  met: boolean;
  /** Clear message telling the user which prerequisite field must be filled or selected first. */
  message: string;
  /** Optional `data-field-name` of the prerequisite field to focus and highlight when clicked. */
  focusField?: string;
}

export interface AppSelectOption {
  value: string;
  label: string;
  subLabel?: string;
  badge?: string;
  disabled?: boolean;
}

