import { Routes } from '@angular/router';
import { onlyNewUsers, requireRoutines } from './data/guards';
import { Onboarding } from './onboarding/onboarding';
import { ChainEditor } from './routines/chain-editor';
import { Progress } from './progress/progress';
import { Reflection } from './reflection/reflection';
import { NewRoutine } from './routines/new-routine';
import { Routines } from './routines/routines';
import { Settings } from './settings/settings';
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
  // Reading pages load on demand, so they don't slow down opening the app.
  {
    path: 'privacy',
    loadComponent: () => import('./privacy/privacy').then((m) => m.Privacy),
    title: 'Privacy · AndThen',
  },
  {
    path: 'terms',
    loadComponent: () => import('./legal/terms').then((m) => m.Terms),
    title: 'Terms of Use · AndThen',
  },
  {
    path: 'help',
    loadChildren: () => import('./help/help.routes').then((m) => m.HELP_ROUTES),
  },
  {
    path: 'whats-new',
    loadComponent: () => import('./about/whats-new').then((m) => m.WhatsNew),
    title: "What's new · AndThen",
  },
  {
    // The link in the sign-in email lands here.
    path: 'sign-in',
    component: SignInPage,
    title: 'Sign in · AndThen',
  },
  {
    // Where a shared routine link lands (the routine is in the #). Open to everyone,
    // new or not, and loads on demand.
    path: 'add',
    loadComponent: () => import('./share/add-shared-routine').then((m) => m.AddSharedRoutine),
    title: 'Add a shared routine · AndThen',
  },
  {
    // Run a routine: a full-screen, one-habit-at-a-time view. Loads on demand.
    path: 'run/:id',
    canActivate: [requireRoutines],
    loadComponent: () => import('./run/run-routine').then((m) => m.RunRoutine),
    title: 'Run routine · AndThen',
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
      {
        path: 'recap',
        loadComponent: () => import('./recap/weekly-recap').then((m) => m.WeeklyRecap),
        title: 'Your week · AndThen',
      },
      {
        path: 'year',
        loadComponent: () => import('./year/year-view').then((m) => m.YearView),
        title: 'Your year · AndThen',
      },
      { path: 'settings', component: Settings, title: 'Settings · AndThen' },
    ],
  },
  { path: '**', redirectTo: '' },
];
