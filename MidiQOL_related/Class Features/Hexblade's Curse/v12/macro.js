const lastArg = args[args.length - 1];
let sourceActor, sourceToken, targetActor;
if (args[0] === 'on') return;
else if (args[0] === 'off') {
	//cleaning when deleting from caster
	targetActor = canvas.tokens.placeables.find((i) => i.actor.effects.find((eff) => eff.label === "Hexblade's Curse Mark"))?.actor;
	if (targetActor) {
		const hasEffect = targetActor.appliedEffects.find((eff) => eff.name === "Hexblade's Curse Mark");
		if (hasEffect) {
			await MidiQOL.socket().executeAsGM('removeEffects', { actorUuid: targetActor.uuid, effects: [hasEffect.id] });
		}
	}
	return;
} else if (lastArg.tag === 'DamageBonus') {
	//caster hitting for extra damage
	targetActor = fromUuidSync(lastArg.hitTargetUuids[0])?.actor;
	if (targetActor?.flags?.dae?.onUpdateTarget && lastArg.hitTargets.length > 0) {
		const isMarked = targetActor.flags.dae.onUpdateTarget.find((flag) => flag.flagName === "Hexblade's Curse" && flag.targetTokenUuid === lastArg.hitTargets[0].uuid);
		if (isMarked) {
			let damageType = lastArg.item.system.damage.parts[0][1];
			return new CONFIG.Dice.DamageRoll(`@prof[${damageType}]`, lastArg.actor.getRollData(), { flavor: "Hexblade's Curse damage" });
		}
	}
	return true;
} else if (lastArg.macroPass === 'preAttackRoll') {
	//caster Attacking
	targetActor = fromUuidSync(lastArg.hitTargetUuids[0])?.actor;
	if (targetActor?.flags?.dae?.onUpdateTarget && lastArg.targets.length > 0) {
		const isMarked = targetActor.flags.dae.onUpdateTarget.find((flag) => flag.flagName === "Hexblade's Curse" && flag.sourceTokenUuid === lastArg.tokenUuid);
		if (isMarked) {
			const effectData = {
				changes: [
					{ key: 'flags.dnd5e.weaponCriticalThreshold', mode: CONST.ACTIVE_EFFECT_MODES.UPGRADE, value: '19', priority: '20' },
					{ key: 'flags.dnd5e.spellCriticalThreshold', mode: CONST.ACTIVE_EFFECT_MODES.UPGRADE, value: '19', priority: '20' },
				],
				duration: {
					startTime: game.time.worldTime,
				},
				icon: 'icons/skills/melee/strike-dagger-white-orange.webp',
				name: 'Critical Threshold change',
				flags: {
					core: { statusId: 'HexBlade Curse - Critical Threshold' },
					dae: { specialDuration: ['1Attack'] },
				},
				origin: macroItem.uuid,
			};
			await actor.createEmbeddedDocuments('ActiveEffect', [effectData]);
		}
	}
} else if (lastArg.tag === 'onUpdateTarget') {
	// hp.value was updated on the actor
	if (lastArg.updates.system.attributes.hp.value === 0) {
		sourceActor = fromUuidSync(lastArg.origin?.split('.Item')[0]);
		if (!sourceActor) {
			console.log('error in line 54 of Hexblade ItemMacro');
			ui.notification.error('Hexblade Macro issue, let the GM know');
		}
		sourceToken = sourceActor?.token ?? sourceActor?.getActiveTokens()[0];
		const healing = Math.max(1, sourceActor.getRollData().classes.warlock.levels + sourceActor.getRollData().abilities.cha.mod);
		await MidiQOL.applyTokenDamage([{ damage: healing, type: 'healing' }], healing, new Set([sourceToken]), null, null, { forceApply: false });
		const sourceEffect = sourceActor.appliedEffects.find((eff) => eff.name === "Hexblade's Curse");
		if (sourceEffect) await MidiQOL.socket().executeAsGM('removeEffects', { actorUuid: sourceActor.uuid, effects: [sourceEffect.id] });
	}
}
