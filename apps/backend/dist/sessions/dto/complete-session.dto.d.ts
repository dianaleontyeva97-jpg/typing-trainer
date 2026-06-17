export declare class KeystrokeEventDto {
    position_index: number;
    expected_char: string;
    typed_char: string;
    timestamp: string;
    reaction_time_ms: number;
    is_correct: boolean;
}
export declare class CompleteSessionDto {
    keystroke_events: KeystrokeEventDto[];
}
