// ===========================================
// script.js - RPG Batallas con Mascotas (Corregido)
// ===========================================

// Cargar datos guardados
function loadGame() {
    const saved = localStorage.getItem('rpgSave');
    if (saved) {
        const data = JSON.parse(saved);
        character = { ...character, ...data.character };
        playerPets = data.playerPets || [];
    }
}

// Guardar datos
function saveGame() {
    localStorage.setItem('rpgSave', JSON.stringify({ character, playerPets }));
}

// Datos corregidos (agregué level/experience a pets)
const obtainableAbilities = [
    "Crecimiento: +5 todos los atributos",
    "Concentración: +3% probabilidad de crítico",
    "Evasión: +3% probabilidad de evasión",
    "Sabiduría: +3% probabilidad de anticipar e interrumpir el ataque del jugador enemigo"
];

const abilities = {
    Absorción: { description: "Regenera 5% HP.", effect: (user) => { const heal = user.maxHealth * 0.05; user.health = Math.min(user.maxHealth, user.health + heal); return `regeneró ${Math.round(heal)} HP.`; } },
    Rebote: { description: "Devuelve 10% daño.", effect: (user, target, damage) => { const reb = damage * 0.1; target.health -= reb; return `devolvió ${Math.round(reb)} daño.`; } },
    Trampa: { description: "Reduce speed -1 (acumulable).", effect: (target) => { target.speed = Math.max(1, target.speed - 1); return `redujo speed enemigo.`; } },
    Desgarrar: { description: "Daño extra 5 + hemorragia.", effect: (target) => { target.health -= 5; target.hemorrhage = (target.hemorrhage || 0) + 0.04 * target.maxHealth; return `desgarró por 5 + hemorragia.`; } },
    Desolar: { description: "Daño masivo 15.", effect: (target) => { target.health -= 15; return `desolado por 15 daño.`; } },
    Robo: { description: "Roba 5% HP.", effect: (user, target) => { const steal = target.health * 0.05; user.health += steal; target.health -= steal; return `robó ${Math.round(steal)} HP.`; } },
    Fuego: { description: "Daño fuego 10.", effect: (target) => { target.health -= 10; return `quemó por 10.`; } },
    Vuelo: { description: "Agility +2.", effect: (user) => { user.agility += 2; return `agilidad +2.`; } }
};

const pets = {
    Slime: { name: "Slime", maxHealth: 50, health: 50, strength: 5, speed: 6, agility: 4, level: 1, experience: 0, bonus: { speed: 1 }, abilities: { innate: ["Absorción"], own: ["Rebote"], obtainable: obtainableAbilities }, avatar: "images/slime_pet.png", damageToPlayer: 2, attack: { type: "Básico", multiplier: 0.5 } },
    Goblin: { name: "Goblin", maxHealth: 60, health: 60, strength: 8, speed: 5, agility: 5, level: 1, experience: 0, bonus: { strength: 2 }, abilities: { innate: ["Robo"], own: ["Trampa", "Desgarrar"], obtainable: obtainableAbilities }, avatar: "images/goblin_pet.png", damageToPlayer: 3, attack: { type: "Físico", multiplier: 1.0 } },
    Troll: { name: "Troll", maxHealth: 80, health: 80, strength: 10, speed: 4, agility: 3, level: 1, experience: 0, bonus: { health: 20 }, abilities: { innate: ["Absorción"], own: ["Trampa", "Desolar"], obtainable: obtainableAbilities }, avatar: "images/troll_pet.png", damageToPlayer: 5, attack: { type: "Físico", multiplier: 1.2 } },
    Lobo: { name: "Lobo", maxHealth: 70, health: 70, strength: 7, speed: 7, agility: 6, level: 1, experience: 0, bonus: { agility: 2 }, abilities: { innate: ["Evasión"], own: ["Desgarrar"], obtainable: obtainableAbilities }, avatar: "images/wolf_pet.png", damageToPlayer: 3, attack: { type: "Físico", multiplier: 1.0 } },
    Fénix: { name: "Fénix", maxHealth: 90, health: 90, strength: 6, speed: 6, agility: 7, level: 1, experience: 0, bonus: { health: 10, agility: 2 }, abilities: { innate: ["Fuego"], own: ["Vuelo"], obtainable: obtainableAbilities }, avatar: "images/phoenix_pet.png", damageToPlayer: 5, attack: { type: "Mágico", multiplier: 1.5 } }
};

const enemies = {
    Slime: { type: 'Monstruo', maxHealth: 50, health: 50, damage: 5, experience: 10, avatar: "images/slime.png", abilities: ["Absorción"] },
    Goblin: { type: 'Monstruo', maxHealth: 60, health: 60, damage: 8, experience: 15, avatar: "images/goblin.png", abilities: ["Trampa"] },
    Troll: { type: 'Mini Jefe', maxHealth: 100, health: 100, damage: 12, experience: 30, avatar: "images/troll.png", abilities: ["Desolar"] },
    // ... agrega más como Dragon, etc.
    "Dragón de Hielo": { type: 'Jefe', maxHealth: 600, health: 600, damage: 25, experience: 200, avatar: "images/ice_dragon.png", abilities: ["Fuego", "Vuelo"] }
};

let playerPets = [];
let character = { name: "Bruto", maxHealth: 100, health: 100, strength: 10, speed: 5, agility: 3, level: 1, experience: 0, activePet: null };
let selectedEnemy = null;
let selectedDungeon = null;

// Inicializar
loadGame();

// Funciones principales corregidas
function levelUp(entity) {
    const expNeeded = entity.level * 20;
    while (entity.experience >= expNeeded && entity.level < (entity.maxLevel || 70)) {
        entity.experience -= expNeeded;
        entity.level++;
        entity.maxHealth += 10;
        entity.health += 10;
        entity.strength += 2;
        entity.speed += 1;
        entity.agility += 1;
    }
    updateUI();
}

function tryToObtainPet(enemy) {
    if (character.level < 5) return "Nivel 5+ para mascotas.";
    const probs = { Monstruo: 0.05, 'Mini Jefe': 0.15, Jefe: 0.25 };
    if (Math.random() < probs[enemy.type]) {
        const petNames = { Monstruo: ['Slime'], 'Mini Jefe': ['Goblin', 'Troll'], Jefe: ['Lobo', 'Fénix'] };
        const petName = petNames[enemy.type][Math.floor(Math.random() * petNames[enemy.type].length)];
        const pet = { ...pets[petName] };
        if (!playerPets.find(p => p.name === pet.name) && playerPets.length < 3) {
            playerPets.push(pet);
            applyPetBonuses();
            return `¡Obtuviste ${pet.name}!`;
        }
    }
    return "Sin mascota esta vez.";
}

function applyPetBonuses() {
    if (character.activePet) {
        const pet = playerPets.find(p => p.name === character.activePet);
        if (pet) {
            character.strength += pet.bonus.strength || 0;
            // ... otros bonuses
        }
    }
}

function petAttack(pet, enemy) {
    let log = '';
    const damage = pet.strength * pet.attack.multiplier;
    enemy.health -= damage;
    log += `${pet.name} causó ${Math.round(damage)} daño.<br>`;
    // Innatas y own
    [...pet.abilities.innate, ...pet.abilities.own.slice(0,1)].forEach(ab => { // Solo 1 own por turno
        const effect = abilities[ab.split(':')[0]];
        if (effect) log += `${pet.name} usó ${ab}: ${effect.effect(pet, enemy, damage)}<br>`;
    });
    return log;
}

function enemyUseAbilities(enemy, player) {
    let log = '';
    enemy.abilities.forEach(ab => {
        const effect = abilities[ab];
        if (effect && Math.random() < 0.5) log += `Enemigo usó ${ab}: ${effect.effect(enemy, player)}<br>`;
    });
    return log;
}

function updateUI() {
    ['health', 'strength', 'speed', 'agility', 'level', 'experience'].forEach(stat => {
        document.getElementById(`char-${stat}`)?.textContent = character[stat];
    });
    document.getElementById('player-health') && (document.getElementById('player-health').textContent = `Salud: ${character.health}`);
    saveGame();
}

// Combate genérico
function doBattle(enemy) {
    let pHealth = character.health;
    let eHealth = enemy.health;
    let turn = 1;
    let log = `<h3>vs ${enemy.type || enemy.name}</h3>`;
    const playerSpeed = character.speed + (character.activePet ? playerPets.find(p => p.name === character.activePet)?.speed || 0 : 0);
    const enemySpeed = enemy.speed || 5;

    while (pHealth > 0 && eHealth > 0) {
        // Orden por speed
        const playerFirst = playerSpeed > enemySpeed;
        if (playerFirst) {
            const dmg = character.strength;
            eHealth -= dmg;
            log += `Turno ${turn}: Jugador ${playerFirst ? 'primero' : ''} causó ${dmg}. E: ${eHealth}<br>`;
            if (character.activePet) log += petAttack(playerPets.find(p => p.name === character.activePet), enemy);
        }
        if (eHealth <= 0) break;
        const eDmg = enemy.damage;
        pHealth -= eDmg;
        log += `Enemigo causó ${eDmg}. P: ${pHealth}<br>${enemyUseAbilities(enemy, character)}`;
        if (pHealth <= 0) break;
        turn++;
    }
    if (pHealth > 0) {
        character.experience += enemy.experience;
        character.health = pHealth;
        levelUp(character);
        log += `¡Victoria! +${enemy.experience} EXP. ${tryToObtainPet(enemy)}`;
    } else {
        log += '¡Derrota!';
    }
    return log;
}

// Event listeners (corregidos)
document.addEventListener('DOMContentLoaded', () => {
    updateUI();
    document.getElementById('train-button')?.addEventListener('click', () => {
        const enemy = enemies[Object.keys(enemies)[Math.floor(Math.random()*3)]]; // Random training
        document.getElementById('result-content').innerHTML = doBattle(enemy);
    });
    // Dungeon flow
    document.getElementById('dungeon-button')?.addEventListener('click', () => { selectedDungeon = 'Mazmorras'; loadEnemySelection(); });
    document.getElementById('pet-dungeon-button')?.addEventListener('click', () => { selectedDungeon = 'Mazmorra de Mascotas'; loadEnemySelection(); });
    document.getElementById('fight-button')?.addEventListener('click', () => {
        const sel = document.getElementById('enemy-list')?.value;
        selectedEnemy = enemies[sel];
        if (selectedEnemy) {
            document.getElementById('battle-log').innerHTML = doBattle(selectedEnemy);
            document.getElementById('enemy-health').textContent = `Salud: 0`;
        }
    });
    // Más listeners...
});

function loadEnemySelection() {
    const list = document.getElementById('enemy-list');
    list.innerHTML = '';
    Object.keys(enemies).forEach(name => {
        const opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name;
        list.appendChild(opt);
    });
    // Mostrar/ocultar divs...
}