 HOW TO:
1. Grab the Mass Cure Wounds from the Spells (SRD) compendium.
2. Add an onUse macro for either ItemMacro, or macro name, executed After Targeting Complete and copy-paste this macro.
3. In the activation condition field add a string including a combination of the following: 
   - "auto": if you want to auto target if less that 4 valid Targets. Choosing "auto" will only affect the Dialog creation if the valid Targets <= 6.
   - "all": if you want to be able to affect all tokens, no matter the disposition.
   - "allies": if you want to be able to affect only allied tokens to the caster.
   - "enemies": if you want to be able to affect only enemy tokens compared to the caster.
   eg. Activation condition of: "auto allies" will auto target allied tokens if less than 6 available.
Keep in mind that the valid Tokens will be filtered to only show ones with missing HP.
4. Cast the spell.


![image](https://user-images.githubusercontent.com/7237090/217245581-d71dcbb0-8b36-456b-92d3-be9b5144fbd3.png)
![image](https://user-images.githubusercontent.com/7237090/217245649-8722a042-3495-4aad-b072-8b5ff758785f.png)