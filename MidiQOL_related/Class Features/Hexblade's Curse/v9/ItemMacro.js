const lastArg = args[args.length - 1];
let sourceActor;
let sourceToken;
let targetActor;

if(args[0]==="on") return;

else if(args[0]==="off") { //cleaning when deleting from caster
    targetActor = canvas.tokens.placeables.find(i=>i.actor.effects.find(eff=>eff.data.label === "Hexblade's Curse Mark"))?.actor;
    if (targetActor) {
        const hasEffect = targetActor.effects.find(eff=>eff.data.label === "Hexblade's Curse Mark");
        if (hasEffect) {
            await MidiQOL.socket().executeAsGM("removeEffects", { actorUuid: targetActor.uuid, effects: [hasEffect.id] });
        }
    }
    return;
}

else if (args[0].tag === "DamageBonus") { //caster hitting for extra damage
    targetActor = (await fromUuid(lastArg.hitTargetUuids[0]))?.actor;
    if (targetActor?.flags?.dae?.onUpdateTarget && lastArg.hitTargets.length > 0) {
        const isMarked = targetActor.flags.dae.onUpdateTarget.find(flag => flag.flagName === "Hexblade's Curse" && flag.targetTokenUuid === lastArg.hitTargets[0].uuid);
        if (isMarked) {
            let damageType = lastArg.item.data.data.damage.parts[0][1];
            return {damageRoll: `@prof[${damageType}]`, flavor: "Hexblade's Curse damage"};
        }   
    }
    return;
}
else if (args[0].macroPass === "preAttackRoll") { //caster Attacking
    targetActor = (await fromUuid(lastArg.hitTargetUuids[0]))?.actor;
    if (targetActor?.flags?.dae?.onUpdateTarget && lastArg.targets.length > 0) {
        const isMarked = targetActor.flags.dae.onUpdateTarget.find(flag => flag.flagName === "Hexblade's Curse" && flag.sourceTokenUuid === lastArg.tokenUuid);
        if (isMarked) {
            const effectData = {
                "changes":[
                    { "key": "flags.dnd5e.weaponCriticalThreshold", "mode": CONST.ACTIVE_EFFECT_MODES.OVERRIDE, "value": "19", "priority": "20" },
                    { "key": "flags.dnd5e.spellCriticalThreshold", "mode": CONST.ACTIVE_EFFECT_MODES.OVERRIDE, "value": "19", "priority": "20" }                
                ],
                "duration": {
                    "startTime": game.time.worldTime,
                },
                "icon": "icons/skills/melee/strike-dagger-white-orange.webp",
                "label": "Critical Threshold change",
                "flags": {
                    "core": { "statusId": "HexBlade Curse - Critical Threshold" },
                    "dae": { "specialDuration": [ "1Attack" ] }
            }
        }
        sourceActor = (await fromUuid(lastArg.tokenUuid)).actor;
        await MidiQOL.socket().executeAsGM("createEffects", { actorUuid: sourceActor.uuid, effects: [effectData] });
        }
    }
    return;
}

else if (lastArg.tag === "onUpdateTarget") { // hp.value was updated on the actor
    if (lastArg.updates.data.attributes.hp.value === 0) {
        sourceActor = await fromUuid(lastArg.origin?.split(".Item")[0]);
        if (!sourceActor) {
            console.log("error in line 66 of Hexblade ItemMacro")
            ui.notification.error("Hexblade Macro issue, let the GM know")
        }
        sourceToken = sourceActor?.token ?? sourceActor?.getActiveTokens()[0];
        const healing = Math.max(1, sourceActor.getRollData().classes.warlock.levels + sourceActor.getRollData().abilities.cha.mod)
        await MidiQOL.applyTokenDamage([{damage: healing, type: 'healing'}], healing, new Set([sourceToken]), null, null, {forceApply:false} )
        const sourceEffect = sourceActor.effects.find(eff=>eff.data.label === "Hexblade's Curse");
        if (sourceEffect) await MidiQOL.socket().executeAsGM("removeEffects", { actorUuid: sourceActor.uuid, effects: [sourceEffect.id] });
    }
}
