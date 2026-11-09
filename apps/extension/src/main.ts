import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { Popup } from './app/popup';

bootstrapApplication(Popup, appConfig).catch((err) => console.error(err));
