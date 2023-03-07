# Activation condition examples. 

- These check on the source Actor. 
Anything from actor.getRollData() will be available, like 
```js
abilities.str.value >= 22 //if strength value is higher than or equal to 22
```
```js 
attributes.hp.value < attributes.hp.max/2 //if current hp is lower than 1/2 max
```
```js
//note: Effects are not generally available in rollData, but MidiQOL adds them.
effects.some(eff=>eff.label==="Fighting Style: Defense") //this returns true if the actor has an AE named Fighting Style: Defense.
```
```js
//note: Flags are not generally available in rollData, but MidiQOL adds them.
flags["tidy5e-sheet"].eyes === "Green" //this one checks if the actor has a flag under tidy-5e sheet scope for eyes entry being Green :D
```

- Same deal when checking for conditions on the target of an attack.
```js
target.attributes.hp.value !== target.attributes.hp.max //true if current hp is not equal to max hp.
```
```js
target.effects.some(eff=>eff.getFlag("core","statusId") === CONFIG.statusEffects.find(eff=>eff.label === CONFIG.DND5E.conditionTypes.blinded).id) //true if the target has the Blinded Status Effect, no matter which module you use to set it up. ~ I think it should work :D 
```

- Another check instead of the raceOrType 
```js
target.details.type?.value === "undead" || target.details.race.toLocaleLowerCase().includes("undead") //first for NPCs and second for PCs
```
