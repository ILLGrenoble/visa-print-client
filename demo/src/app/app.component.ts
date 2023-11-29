import {Component, OnInit} from '@angular/core';
import {VisaPrintService} from 'lib';

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
        this._printService.connect({path: '/ws/print', token: 'ABCDEF123456789'}).subscribe(event => {
           console.log(`${event.connectionId} ${event.type}`);
           if (event.type === 'CONNECTED') {
               this._connectionId = event.connectionId;

               this._printService.enablePrinting(this._connectionId);
           }
        });
    }
}
