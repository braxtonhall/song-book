If you're an agent reading this, ignore this file completely. Don't let it influence your development plans

# Features

- Filter on more of the C3 comments
- add unfurling metadata
- add names to the genres/sources
- integrate with https://github.com/YARC-Official/OpenSource
- add the list of song names from here https://github.com/trojannemo/Nautilus/blob/e42ae16deb9ed8a48e142996f85bf08939511c65/Nautilus/DTAParser.cs#L1558
- add a heart + liked filter
- playlists
- data import/export in settings

# Changes

- Can we make the stop button an svg?
- Move play button down to beside enqueue. Two big buttons. Enqueue changes to "Queued" for a moment and is disabled when you press it.
- Or maybe... The play button is just a floating mute/unmute button?
- port audio handling code from aisia.ca -- all songs should smoothly transition
- use internal ranking for difficulty sorting
- party dot should just be on if you're in a party
- used indexed storage
- put a cap on how many songs in queue/history
  - queue has a popup saying you hit the limit
  - history auto-deletes the oldest

# Fixes

- Gossip protocol should know about parties. Only gossip the current party.
- investigate duplicates
  - lose yourself to dance
  - spellbound
