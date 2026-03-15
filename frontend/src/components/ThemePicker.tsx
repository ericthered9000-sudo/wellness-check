import { useTheme } from '../contexts/ThemeContext';
import type { ThemeName, TextSize } from '../contexts/ThemeContext';
import './ThemePicker.css';

interface ThemePickerProps {
  onClose?: () => void;
}

export function ThemePicker({ onClose }: ThemePickerProps) {
  const { theme, setTheme, textSize, setTextSize, highContrast, setHighContrast, themes } = useTheme();

  const themeOptions: { key: ThemeName; emoji: string; description: string }[] = [
    { key: 'calm', emoji: '🌊', description: 'Trust blue, clean and clinical' },
    { key: 'ocean', emoji: '🐚', description: 'Teal and cyan, spa-like' },
    { key: 'garden', emoji: '🌿', description: 'Forest green, natural feel' },
    { key: 'sunset', emoji: '🌅', description: 'Orange and amber, warm' },
    { key: 'classic', emoji: '⬛', description: 'Black and white, high readability' },
    { key: 'night', emoji: '🌙', description: 'Dark mode, easy on eyes' },
  ];

  const textSizeOptions: { key: TextSize; label: string }[] = [
    { key: 'small', label: 'Small' },
    { key: 'medium', label: 'Medium' },
    { key: 'large', label: 'Large' },
    { key: 'xlarge', label: 'Extra Large' },
  ];

  return (
    <div className="theme-picker">
      <div className="theme-picker-header">
        <h3>🎨 Customize Your Experience</h3>
        {onClose && (
          <button className="close-btn" onClick={onClose}>×</button>
        )}
      </div>

      <div className="theme-section">
        <h4>Theme</h4>
        <p className="section-hint">Choose a look that feels right for you</p>
        <div className="theme-grid">
          {themeOptions.map(option => (
            <button
              key={option.key}
              className={`theme-card ${theme === option.key ? 'selected' : ''}`}
              onClick={() => setTheme(option.key)}
              style={{
                '--preview-primary': themes[option.key].colors.primary,
                '--preview-bg': themes[option.key].colors.background,
              } as React.CSSProperties}
            >
              <div className="theme-preview">
                <div className="preview-bar" style={{ background: themes[option.key].colors.primary }}></div>
                <div className="preview-content">
                  <div className="preview-circle" style={{ background: themes[option.key].colors.secondary }}></div>
                  <div className="preview-lines">
                    <div className="preview-line" style={{ background: themes[option.key].colors.textMuted }}></div>
                    <div className="preview-line short" style={{ background: themes[option.key].colors.border }}></div>
                  </div>
                </div>
              </div>
              <div className="theme-info">
                <span className="theme-emoji">{option.emoji}</span>
                <span className="theme-name">{themes[option.key].name}</span>
              </div>
              {theme === option.key && <span className="check">✓</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="theme-section">
        <h4>Text Size</h4>
        <p className="section-hint">Make text easier to read</p>
        <div className="text-size-options">
          {textSizeOptions.map(option => (
            <button
              key={option.key}
              className={`size-btn ${textSize === option.key ? 'selected' : ''}`}
              onClick={() => setTextSize(option.key)}
            >
              <span style={{ fontSize: option.key === 'small' ? '14px' : option.key === 'medium' ? '16px' : option.key === 'large' ? '18px' : '22px' }}>
                Aa
              </span>
              <span className="size-label">{option.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="theme-section">
        <h4>Accessibility</h4>
        <div className="toggle-option">
          <div className="toggle-info">
            <span className="toggle-label">High Contrast Mode</span>
            <span className="toggle-hint">Maximum readability with black and white</span>
          </div>
          <button
            className={`toggle ${highContrast ? 'on' : 'off'}`}
            onClick={() => setHighContrast(!highContrast)}
          >
            <span className="toggle-slider"></span>
          </button>
        </div>
      </div>

      <div className="theme-footer">
        <p className="preview-text">
          Your preferences are saved automatically and will be remembered next time.
        </p>
      </div>
    </div>
  );
}

export function ThemeButton({ onClick }: { onClick: () => void }) {
  return (
    <button className="theme-btn" onClick={onClick} title="Customize appearance">
      <span className="theme-icon">🎨</span>
      <span className="theme-label">Themes</span>
    </button>
  );
}