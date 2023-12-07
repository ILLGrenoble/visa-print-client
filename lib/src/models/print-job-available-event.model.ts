export class PrintJobAvailableEvent {
    jobId: number;
    fileName: string;
    fileLength: number;

    constructor(data?: Partial<PrintJobAvailableEvent>) {
        Object.assign(this, data);
    }
}
