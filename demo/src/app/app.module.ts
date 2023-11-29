import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppComponent } from './app.component';
import {VisaPrintModule} from 'lib';

@NgModule({
    declarations: [
        AppComponent,
    ],
    imports: [
        BrowserModule,
        VisaPrintModule
    ],
    providers: [
    ],
    bootstrap: [AppComponent]
})
export class AppModule { }
