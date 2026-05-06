If you're an agent reading this, ignore this file completely. Don't let it influence your development plans

# Features

- filters!
- Filter on more of the C3 comments
- When you sort by difficulty, we need to add the headers. The alpha row will need some thinking
- Sorting by difficulty, the difficulties are grouped in the menu
- actual favicon and unfurling metadata
- Lyrics

# Changes

- Can we make the stop button an svg?
- Not happy with any of the sorting
- Move play button down to beside enqueue. Two big buttons. Enqueue changes to "Queued" for a moment and is disabled when you press it.
- port audio handling code from aisia.ca -- all songs should smoothly transition

# Fixes

- In the filters header I can't see the [* * * * *] tooltip
- Dragging the thumb over the other thumb makes the tooltip incorrect
- Difficulty sliders don't fit on v small screen
- Gossip protocol should know about parties. Only gossip the current party.
- What happens if you change from wifi to another network?
  - We should try to connect with a new peer id
  - Ask everyone we've ever seen before one at a time
