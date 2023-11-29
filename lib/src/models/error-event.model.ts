export class ErrorEvent {
    type: 'CONNECTION_ERROR' | 'ERROR' | 'EXCEPTION';
    message: string;

    constructor(data?: Partial<ErrorEvent>) {
        Object.assign(this, data);
    }
}
