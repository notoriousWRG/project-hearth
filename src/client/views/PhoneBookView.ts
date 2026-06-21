import type { PhoneBookEntry } from '../../shared/types.js';
import * as api from '../utils/api.js';

export function createPhoneBookView(): HTMLElement {
  const view = document.createElement('div');
  view.className = 'phone-book-view';

  const header = document.createElement('header');
  header.className = 'phone-book-view__header';
  const heading = document.createElement('h1');
  heading.textContent = '📞 Phone Book';
  header.appendChild(heading);
  view.appendChild(header);

  const list = document.createElement('div');
  list.className = 'phone-book-view__list';
  view.appendChild(list);

  function render(entries: PhoneBookEntry[]): void {
    list.innerHTML = '';
    if (entries.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'phone-book-view__empty';
      empty.textContent = 'No contacts yet. Add some in Settings.';
      list.appendChild(empty);
      return;
    }
    for (const entry of entries) {
      const card = document.createElement('div');
      card.className = 'phone-book-card';

      if (entry.emoji) {
        const emoji = document.createElement('span');
        emoji.className = 'phone-book-card__emoji';
        emoji.textContent = entry.emoji;
        card.appendChild(emoji);
      }

      const info = document.createElement('div');
      info.className = 'phone-book-card__info';

      const name = document.createElement('div');
      name.className = 'phone-book-card__name';
      name.textContent = entry.name;
      info.appendChild(name);

      const phone = document.createElement('div');
      phone.className = 'phone-book-card__phone';
      phone.textContent = entry.phone;
      info.appendChild(phone);

      card.appendChild(info);
      list.appendChild(card);
    }
  }

  void api.phoneBook.list().then(render);

  return view;
}
