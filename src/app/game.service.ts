import { Injectable } from '@angular/core';
import {
  AngularFirestore,
  AngularFirestoreDocument,
} from '@angular/fire/firestore';
import { from, Observable, of } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { Card } from './game-board/game-board.component';
import { PictureService } from './picture.service';
import { randomString } from './util';

export interface Game {
  code: string;
  cards: Card[];
  teamTurn: number;
  teamWon: number;
}

@Injectable({
  providedIn: 'root',
})
export class GameService {
  currentGame: AngularFirestoreDocument<Game> | undefined;

  constructor(
    private afs: AngularFirestore,
    private pictureService: PictureService
  ) {}

  createNewGame(code?: string): Observable<string> {
    const length = 6;
    const values = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

    const newGame = this.generateGame(
      code ? code : randomString(length, values)
    );
    if (code) {
      this.currentGame?.set(newGame);
      return of(code);
    } else {
      return from(this.afs.collection<Game>('games').add(newGame)).pipe(
        map((game) => game.id),
        tap((id) => {
          this.afs.doc('gameIds/abc').update({ [newGame.code]: id });
        })
      );
    }
  }

  getGameId(code: string): Observable<string> {
    return this.afs
      .doc<{ [key: string]: string }>('gameIds/abc')
      .get()
      .pipe(
        map((doc) => {
          const key = doc.get(code);
          return key ? key : '';
        })
      );
  }

  getCurrentGame(id: string): AngularFirestoreDocument<Game> {
    this.currentGame = this.afs.doc<Game>(`games/${id}`);
    return this.currentGame;
  }

  updateGame(updatedGame: Game, id: string): Observable<void> {
    return from(this.afs.doc<Game>(`games/${id}`).update(updatedGame));
  }

  private generateGame(code: string, totalCards: number = 20): Game {
    const game: Game = { code, teamTurn: 1, teamWon: 0, cards: [] };

    const cards = game.cards;
    let startId = 0;
    const numTeamCards = 7;
    const images = this.pictureService.getImages(totalCards);

    // add assassin card
    cards.push({
      pictureUrl: images[startId],
      id: startId++,
      team: 0,
      assassin: true,
      selected: false,
    });

    // add team 1 cards
    for (let index = 0; index < numTeamCards + 1; index++) {
      cards.push({
        pictureUrl: images[startId],
        id: startId++,
        team: 1,
        assassin: false,
        selected: false,
      });
    }

    // add team 2 cards
    for (let index = 0; index < numTeamCards; index++) {
      cards.push({
        pictureUrl: images[startId],
        id: startId++,
        team: 2,
        assassin: false,
        selected: false,
      });
    }

    // add neutral cards
    while (cards.length < totalCards) {
      cards.push({
        pictureUrl: images[startId],
        id: startId++,
        team: 0,
        assassin: false,
        selected: false,
      });
    }

    this.shuffle(cards);

    return game;
  }

  private shuffle<T>(array: T[]): T[] {
    let currentIndex = array.length;
    let temporaryValue: T;
    let randomIndex: number;

    // While there remain elements to shuffle...
    while (0 !== currentIndex) {
      // Pick a remaining element...
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex -= 1;

      // And swap it with the current element.
      temporaryValue = array[currentIndex];
      array[currentIndex] = array[randomIndex];
      array[randomIndex] = temporaryValue;
    }

    return array;
  }
}
