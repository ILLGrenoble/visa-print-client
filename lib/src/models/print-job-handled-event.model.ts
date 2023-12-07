export class PrintJobHandledEvent {
    jobId: number;

    constructor(data?: Partial<PrintJobHandledEvent>) {
        Object.assign(this, data);
    }
}
