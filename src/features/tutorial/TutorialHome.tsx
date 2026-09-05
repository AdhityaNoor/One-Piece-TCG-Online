/**
 * Scenario picker — the tutorial's front door.
 *
 * The official Teaching App ships three scenarios and lets you pick one; so
 * does this. Each card says what the scenario teaches, because "Mastering
 * Card Effects (Part 1)" tells a new player nothing on its own.
 *
 * Inline styles, like TutorialSidebar: this folder's Tailwind classes were
 * silently dropped for months (see tailwind.config.js), and the tutorial's
 * own chrome should not depend on that config being right.
 */
import { TUTORIAL_SCENARIOS } from './scenarios';
import { useTutorialPersistenceStore } from './TutorialPersistence';
import type { TutorialScenarioId } from './types';

const INK = '#f4f7ff';
const INK_DIM = '#aab6d4';
const GOLD = '#e0b352';
const PANEL = '#0a1330';
const BORDER = 'rgba(255,255,255,0.14)';

export interface TutorialHomeProps {
  onPick: (id: TutorialScenarioId) => void;
  onExit: () => void;
}

export function TutorialHome({ onPick, onExit }: TutorialHomeProps) {
  const completed = useTutorialPersistenceStore((state) => state.completedScenarioIds);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9998,
        background: `radial-gradient(1200px 600px at 50% -10%, #16306b 0%, ${PANEL} 60%)`,
        color: INK,
        overflowY: 'auto',
        padding: '48px 24px',
      }}
    >
      <div style={{ maxWidth: 940, margin: '0 auto' }}>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 900, letterSpacing: '0.28em', textTransform: 'uppercase', color: GOLD }}>Tutorial</p>
        <h1 style={{ margin: '8px 0 6px', fontSize: 30, fontWeight: 900, lineHeight: 1.15 }}>Learn the One Piece Card Game</h1>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: INK_DIM, maxWidth: 640 }}>
          Three scripted matches, played on the real rules engine. You make every play yourself — the board only accepts
          the move the lesson is teaching, so you cannot get it wrong.
        </p>

        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))', marginTop: 28 }}>
          {TUTORIAL_SCENARIOS.map((scenario, index) => {
            const done = completed.includes(scenario.id);
            return (
              <button
                key={scenario.id}
                type="button"
                onClick={() => onPick(scenario.id)}
                style={{
                  textAlign: 'left',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  padding: 18,
                  borderRadius: 14,
                  border: `1px solid ${done ? 'rgba(126,226,168,0.5)' : BORDER}`,
                  background: 'rgba(255,255,255,0.05)',
                  color: INK,
                  cursor: 'pointer',
                  minHeight: 210,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase', color: GOLD }}>
                    Scenario {index + 1}
                  </span>
                  {done && (
                    <span style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#7ee2a8' }}>
                      Completed
                    </span>
                  )}
                </div>
                <span style={{ fontSize: 18, fontWeight: 800, lineHeight: 1.25 }}>{scenario.title}</span>
                <span style={{ fontSize: 13, lineHeight: 1.55, color: INK_DIM }}>{scenario.blurb}</span>
                <span style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 'auto' }}>
                  {scenario.teaches.map((topic) => (
                    <span
                      key={topic}
                      style={{
                        fontSize: 10.5,
                        fontWeight: 700,
                        padding: '3px 7px',
                        borderRadius: 999,
                        border: `1px solid ${BORDER}`,
                        background: 'rgba(0,0,0,0.3)',
                        color: INK,
                      }}
                    >
                      {topic}
                    </span>
                  ))}
                </span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onExit}
          style={{
            marginTop: 28,
            padding: '9px 16px',
            borderRadius: 8,
            border: `1px solid ${BORDER}`,
            background: 'rgba(255,255,255,0.08)',
            color: INK,
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            cursor: 'pointer',
          }}
        >
          Back to menu
        </button>
      </div>
    </div>
  );
}
