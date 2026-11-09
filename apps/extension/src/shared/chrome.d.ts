/**
 * Just the extension APIs AndThen uses, typed by hand to keep the dependency list short.
 * Chrome, Edge and Firefox all provide them on `chrome` (Firefox also as `browser`),
 * and in Manifest V3 each call returns a promise.
 */
declare namespace chrome {
  interface ExtEvent<T extends (...args: never[]) => unknown> {
    addListener(callback: T): void;
    removeListener(callback: T): void;
  }

  namespace runtime {
    const id: string;
    function sendMessage(message: unknown): Promise<unknown>;
    function getURL(path: string): string;
    const onInstalled: ExtEvent<() => void>;
    const onStartup: ExtEvent<() => void>;
    const onMessage: ExtEvent<(message: unknown, sender: unknown) => void>;
  }

  namespace storage {
    interface StorageArea {
      get(keys: string | string[]): Promise<Record<string, unknown>>;
      set(items: Record<string, unknown>): Promise<void>;
    }
    const local: StorageArea;
    const onChanged: ExtEvent<(changes: Record<string, unknown>, areaName: string) => void>;
  }

  namespace alarms {
    interface Alarm {
      name: string;
    }
    function create(
      name: string,
      info: { periodInMinutes?: number; delayInMinutes?: number },
    ): Promise<void>;
    function get(name: string): Promise<Alarm | undefined>;
    const onAlarm: ExtEvent<(alarm: Alarm) => void>;
  }

  namespace action {
    function setBadgeText(details: { text: string }): Promise<void>;
    function setBadgeBackgroundColor(details: { color: string }): Promise<void>;
    /** Missing in some older browsers. */
    const setBadgeTextColor: ((details: { color: string }) => Promise<void>) | undefined;
    function setTitle(details: { title: string }): Promise<void>;
    /** Only some browsers allow opening the popup from code. */
    const openPopup: (() => Promise<void>) | undefined;
  }

  namespace notifications {
    interface Options {
      type: 'basic';
      iconUrl: string;
      title: string;
      message: string;
      buttons?: { title: string }[];
    }
    function create(id: string, options: Options): Promise<string>;
    function clear(id: string): Promise<boolean>;
    const onClicked: ExtEvent<(id: string) => void>;
    /** Chrome and Edge only. Firefox has no notification buttons. */
    const onButtonClicked: ExtEvent<(id: string, buttonIndex: number) => void> | undefined;
  }
}
