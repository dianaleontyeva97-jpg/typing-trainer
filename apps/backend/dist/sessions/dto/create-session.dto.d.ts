export declare enum SessionTypeEnum {
    GUEST = "guest",
    LEARNING = "learning"
}
export declare class CreateSessionDto {
    text_id: string;
    session_type: SessionTypeEnum;
    lesson_id?: string;
}
