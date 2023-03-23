            // V10 \\
/***********************************\
1. Set it up as an ItemMacro or macro onUse on the Favored Foe Item.
2. Create on the Favored Foe Item a DAE to apply a "Marked" status on the target if you want that to be shown.

When you use the Favored Foe Item, it will apply the appopriate effects on the sourceActor.

When you first use the Favored Foe Item, you can either use it before attacking or after you make a successful attack to better emulate the RAW (...).

When you activate it before attacking, click no on the Dialog popup.

When you activate it after attacking, click yes on the Dialog popup after choosing the weapon you used to attack and if it was a critical.
It should then damage the target for the correct damage and use the damageType of the original weapon.
Please note that in this case, there is going to be a new concentration check if the target is concentrating already, so use that accordingly.

It will then automatically add the appropriate damage on the first successful hit, once per turn.

\***********************************/



let diceMult;
const sourceActor = args[0].actor;
if (!sourceActor) return ui.notifications.error("The Favored Foe macro is to be used via MidiQOL automation and needs the ItemMacro settings for Sheet Hooks NOT checked");
const rangerLevels = sourceActor.classes.ranger?.system.levels;
if(!rangerLevels) return ui.notifications.warn(`${token.name} has no Ranger levels! Cannot cast Favored Foe!`)
const baseDamage = rangerLevels < 6 ? 4 : (rangerLevels < 12 ? 6 : 8);
const target = args[0].targets[0];
const targetUuid = target?.uuid;
if (!sourceActor || !targetUuid) {
	console.error("Favored Foe: no token/target selected");
	ui.notifications.warn(`${game.user.name} please pick a target to cast Favored Foe!`)
	return;
}

let combatTime;
const lastTime = getProperty(sourceActor.flags.world, 'favoredFoeTime');
if (game.combat) {
    combatTime = `${game.combat.id}-${game.combat.round + game.combat.turn /100}`
}
if (!game.combat && !!getProperty(sourceActor.flags.world, 'favoredFoeTime')) await sourceActor.unsetFlag('world', 'favoredFoeTime');

if (args[0].tag === "OnUse") {
	if (!sourceActor || !targetUuid) {
		console.error("Favored Foe: no token/target selected");
		ui.notifications.warn(`${game.user.name} please pick a target to cast Favored Foe!`)
		return;
	}
	const effectData = {
		changes: [
			{ key: "flags.midi-qol.favoredFoe", mode: 5, value: targetUuid, priority: 20 }, // who is marked
			{ key: "flags.dnd5e.DamageBonusMacro", mode: 0, value: `ItemMacro.${args[0].item.name}`, priority: 20 }
		],
        origin: args[0].item.uuid,
		disabled: false,
        icon: args[0].item.img,
		label: args[0].item.name
	}
	effectData.duration.startTime = game.time.worldTime;
	
	await sourceActor.createEmbeddedDocuments("ActiveEffect", [effectData]);
	
	if (game.combat && combatTime === lastTime) return;
    const weapons = sourceActor.items.filter(i=>i.type==="weapon").map(i=>[i.name,i.getDerivedDamageLabel()[0].damageType]).reduce((arr,[name,type])=>arr+=`<option value="${type}">${name}</option>`,"");
	const content = `
	    <p>Did you already attack?</p>
	    <hr>
        <form>
            <div class="form-group">
                <label for="dmgType">Weapon Used</label>
                <div class="form-fields">
                    <select id="dmgType">${weapons}</select>
                </div>
            </div>
            <div class="form-group">
                <label for="crit">Was it a critical hit?</label>
                <div class="form-fields">
                    <input id="crit" type="checkbox"></input>
                </div>
             </div>
        </form>`;    

	new Dialog({
        title: 'Favored Foe setup',
        content,
        buttons: {
            yes: {
                icon: "<i class='fas fa-check'></i>",
			    label: "Yes!",
			    callback: async (html) => {
			        const dmgType = html[0].querySelector("#dmgType").value;
			        const isCritical = html[0].querySelector("#crit").checked;
			        diceMult = isCritical ? 2 : 1;
			        const roll = await new Roll(`${diceMult}d${baseDamage}`).evaluate({async:true});
			        await game.dice3d?.showForRoll(roll, game.user, true);
			        await new MidiQOL.DamageOnlyWorkflow(sourceActor, token.document, roll.total, `${dmgType}`, [target], roll, {flavor: "Favored Foe initial damage", damageList: args[0].damageList, itemCardId: args[0].itemCardId});
			        if (game.combat) await sourceActor.setFlag('world', 'favoredFoeTime', combatTime);
			    }
            },
            no: {
                icon: "<i class='fas fa-times'></i>",
                label: "No.",
                callback: () => { return; }
            }
        },
        default: "yes",
        close: () => { return; }
    }).render(true);
} 
else if (args[0].tag === "DamageBonus") {
    if (!args[0].hitTargets.length) return;
    if (!["mwak","rwak","msak","rsak"].includes(args[0].item.system.actionType)) return {};
    if (targetUuid !== getProperty(sourceActor.flags, "midi-qol.favoredFoe")) return {};
    if (game.combat && combatTime === lastTime) {
        MidiQOL.warn("Favored Foe Damage: Already done this turn");
        return {};
    }
    await sourceActor.setFlag('world', 'favoredFoeTime', combatTime);
    const damageFormula = new CONFIG.Dice.DamageRoll(`1d${baseDamage}`, sourceActor.getRollData(), {
	critical: args[0].isCritical ?? false, 
   	powerfulCritical: game.settings.get("dnd5e", "criticalDamageMaxDice"),
    	multiplyNumeric: game.settings.get("dnd5e",  "criticalDamageModifiers")
    }).formula;
    return {damageRoll: damageFormula, flavor: "Favored Foe Damage"};
}
