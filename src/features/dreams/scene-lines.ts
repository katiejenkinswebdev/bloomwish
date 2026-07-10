/** Split a visualization scene into speakable lines for paced experiences. */
export function sceneLines(sceneText: string | null, title: string): string[] {
  const text = (sceneText ?? '').trim();
  if (!text) {
    return [
      `It happened: ${title}.`,
      'Look around — you are inside it now.',
      'What do you see first?',
      'What does the air feel like here?',
    ];
  }
  return (text.match(/[^.!?]+[.!?]*/g) ?? [text]).map((l) => l.trim()).filter(Boolean);
}
