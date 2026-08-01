# Panchanga reference audit v1

Overall: **PASS**

## Checks

- PASS — `paksha_uses_canonical_tithi`
- PASS — `mixed_frame_paksha_removed`
- PASS — `yoga_uses_sidereal_sun_and_moon`
- PASS — `pi_uses_sunrise_reference`
- PASS — `forecast_nakshatra_uses_sunrise`
- PASS — `sunrise_convention_is_explicit`
- PASS — `uncertain_calendar_rules_not_promoted`

## Safety conclusion

Paksha now derives from the same canonical tithi calculation; the 27-day Nakshatra display uses the same sunrise reference as P_i. Unvalidated calendar/Tanita candidates remain shadow-only with score effect 0.
