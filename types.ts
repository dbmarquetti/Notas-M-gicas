
export interface ActionItem {
  action: string;
  responsible: string;
}

export interface MeetingSummary {
  key_points: string[];
  action_items: ActionItem[];
}

export interface TranscriptEntry {
  speaker: string;
  text: string;
  timestamp: string;
}

export interface FullAnalysis {
  summary: MeetingSummary;
  transcript: TranscriptEntry[];
}

export interface HistoryItem {
  id: number;
  title: string;
  date: string;
  analysis: FullAnalysis;
  source: 'live' | 'upload';
}
