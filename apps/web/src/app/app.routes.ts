import { Routes } from '@angular/router';
import { onlyNewUsers, requireRoutines } from './data/guards';
import { Onboarding } from './onboarding/onboarding';
import { ChainEditor } from './routines/chain-editor';
import { NewRoutine } from './routines/new-routine';
import { Routines } from './routines/routines';
import { ComingSoon } from './shell/coming-soon';
import { Shell } from './shell/shell';
import { Today } from './today/today';

export const routes: Routes = [
  {
    path: 'welcome',
    component: Onboarding,
    canActivate: [onlyNewUsers],
    title: 'Welcome · AndThen',
  },
  {
    path: '',
    component: Shell,
    canActivate: [requireRoutines],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'today' },
      { path: 'today', component: Today, title: 'Today · AndThen' },
      { path: 'routines', component: Routines, title: 'Routines · AndThen' },
      { path: 'routines/new', component: NewRoutine, title: 'New routine · AndThen' },
      { path: 'routines/:id', component: ChainEditor, title: 'Edit routine · AndThen' },
      {
        path: 'progress',
        component: ComingSoon,
        title: 'Progress · AndThen',
        data: {
          title: 'Progress',
          blurb: 'Coming soon: an 8-week dot grid for every habit and a weekly recap.',
        },
      },
      {
        path: 'settings',
        component: ComingSoon,
        title: 'Settings · AndThen',
        data: { title: 'Settings', blurb: 'Coming soon: reminders and exporting your data.' },
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
