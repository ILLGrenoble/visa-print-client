import {Component, OnInit} from '@angular/core';
import {PrintJobAvailableEvent, VisaPrintService} from 'lib';
import {ManagerOptions, SocketOptions} from "socket.io-client";

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {

    private _connectionId: string;

    constructor(private _printService: VisaPrintService) {

    }

    ngOnInit() {
        const connectionOptions: Partial<ManagerOptions & SocketOptions> = {
            reconnectionDelay: 2000,
            reconnectionAttempts: 4,
            reconnectionDelayMax: 16000,
        };
        this._printService.connect({path: '/ws/print', token: 'ABCDEF123456789'}, connectionOptions).subscribe(event => {
           console.log(`${event.connectionId} ${event.type}`);
           if (event.type === 'CONNECTED') {
               this._connectionId = event.connectionId;

               this._printService.enablePrinting(this._connectionId);

           } else if (event.type === 'PRINT_JOB_AVAILABLE') {
               const printJob = event.data as PrintJobAvailableEvent;
               this._printService.openPrintable(event.connectionId, printJob.jobId);
           }
        });
    }
}
