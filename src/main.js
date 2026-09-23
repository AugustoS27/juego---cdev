// Punto de entrada: crea el juego y lo arranca.
import { Game } from './Game.js';

const game = new Game(document.getElementById('app'));
game.start();

// Solo en desarrollo: dejamos el juego accesible desde la consola del navegador para depurar
if (import.meta.env.DEV) window.game = game;
