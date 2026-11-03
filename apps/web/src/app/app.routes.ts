import { Routes } from '@angular/router';
import { onlyNewUsers, requireRoutines } from './data/guards';
import { Onboarding } from './onboarding/onboarding';
import { ChainEditor } from './routines/chain-editor';
import { Progress } from './progress/progress';
import { Reflection } from './reflection/reflection';
import { NewRoutine } from './routines/new-routine';
import { Routines } from './routines/routines';
import { Settings } from './settings/settings';
import { Privacy } from './privacy/privacy';
import { Shell } from './shell/shell';
import { SignInPage } from './sync/sign-in-page';
import { Today } from './today/today';

export const routes: Routes = [
  {
    path: 'welcome',
    component: Onboarding,
    canActivate: [onlyNewUsers],
    title: 'Welcome · AndThen',
  },
  { path: 'privacy', component: Privacy, title: 'Privacy · AndThen' },
  {
    // The link in the sign-in email lands here.
    path: 'sign-in',
    component: SignInPage,
    title: 'Sign in · AndThen',
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
      { path: 'progress', component: Progress, title: 'Progress · AndThen' },
      { path: 'reflect', component: Reflection, title: 'Weekly reflection · AndThen' },
      { path: 'settings', component: Settings, title: 'Settings · AndThen' },
    ],
  },
  { path: '**', redirectTo: '' },
];
