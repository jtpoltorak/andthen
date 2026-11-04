import type { Type } from '@angular/core';
import type { Routes } from '@angular/router';
import { HELP_ARTICLES, type HelpSlug } from './help-articles';
import { HelpHome } from './help-home';
import * as habits from './articles/habits';
import * as using from './articles/using';
import * as questions from './articles/questions';

/** Which component shows each article. The type makes sure none is missing. */
export const HELP_COMPONENTS: Record<HelpSlug, Type<unknown>> = {
  'start-small': habits.StartSmall,
  anchors: habits.Anchors,
  chains: habits.Chains,
  'make-it-easy': habits.MakeItEasy,
  'feel-finished': habits.FeelFinished,
  'showing-up': habits.ShowingUp,
  'never-miss-twice': habits.NeverMissTwice,
  'how-long': habits.HowLong,
  'reflect-adjust': habits.ReflectAdjust,
  'further-reading': habits.FurtherReading,
  'getting-started': using.GettingStarted,
  today: using.TodayHelp,
  routines: using.RoutinesHelp,
  templates: using.TemplatesHelp,
  'easier-notes': using.EasierNotes,
  schedules: using.SchedulesHelp,
  reminders: using.RemindersHelp,
  progress: using.ProgressHelp,
  reflection: using.ReflectionHelp,
  nudges: using.NudgesHelp,
  install: using.InstallHelp,
  backup: using.BackupHelp,
  sync: using.SyncHelp,
  'start-over': using.StartOverHelp,
  'where-data': questions.WhereData,
  'no-reminders': questions.NoReminders,
  updates: questions.UpdatesHelp,
  'new-device': questions.NewDevice,
  contact: questions.ContactHelp,
};

/** `/help` and `/help/<slug>`, loaded only when someone opens Help. */
export const HELP_ROUTES: Routes = [
  { path: '', component: HelpHome, title: 'Help · AndThen' },
  ...HELP_ARTICLES.map((a) => ({
    path: a.slug,
    component: HELP_COMPONENTS[a.slug],
    title: `${a.title} · Help · AndThen`,
  })),
  { path: '**', redirectTo: '' },
];
