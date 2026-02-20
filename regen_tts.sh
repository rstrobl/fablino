#!/bin/bash
set -e

API_KEY="sk_3da59574b0f0d5497950a2dff26e925157a61709ba2edbd0"
LINES_DIR="/root/.openclaw/workspace/fablino/audio/lines/261949d0-938a-4b1a-a276-3b2328748109"
AUDIO_DIR="/root/.openclaw/workspace/fablino/audio"

mkdir -p "$LINES_DIR"

# Voice mapping
declare -A VOICES
VOICES["Erzähler"]="GoXyzBapJk3AoCJoMQl9"
VOICES["Konstantin"]="Ewvy14akxdhONg4fmNry"
VOICES["Donnerzahn"]="LRpNiUBlcqgIsKUzcrlN"
VOICES["Mama"]="3t6439mGAsHvQFPpoPdf"
VOICES["Papa"]="g1jpii0iyvtRs8fqXsd1"
VOICES["Iris"]="9sjP3TfMlzEjAa6uXh3A"

# Lines array: speaker|line_idx_global|text
LINES=(
'Erzähler|0|Hoch oben auf seinem Schloss blickt der kleine Ritter Konstantin zum fernen Berg hinüber. Dort soll ein großer Goldschatz versteckt sein.'
'Konstantin|1|Heute werde ich den Schatz finden! Ein echter Ritter hat keine Angst.'
'Erzähler|2|Er setzt seinen glänzenden Helm auf und schwingt sich auf sein treues Pferd. Klippety-klopp, klippety-klopp reitet er den Berg hinauf.'
'Konstantin|3|Da vorne ist die Höhle! Und dort glitzert etwas Goldenes.'
'Erzähler|4|Plötzlich erscheint ein riesiger Drache vor der Höhle. Es ist Donnerzahn, und er versucht sehr furchteinflößend auszusehen.'
'Donnerzahn|5|Halt, kleiner Ritter! Niemand darf an meinen Schatz heran. Ich bin der gefährlichste Drache im ganzen Land!'
'Konstantin|6|Du siehst aber gar nicht so gefährlich aus. Du wirkst eher traurig.'
'Donnerzahn|7|Traurig? Ich bin nicht traurig! Ich bin furchtbar und schrecklich! !'
'Erzähler|8|Aber Konstantin hatte Recht. Der Drache wirkte nicht furchteinflößend, sondern einsam und verlassen.'
'Konstantin|9|Weißt du was? Ich glaube, du brauchst einfach einen Freund.'
'Donnerzahn|10|Einen Freund? Aber ich bin doch ein Drache! Drachen haben keine Freunde.'
'Erzähler|11|Da hatte Konstantin eine wunderbare Idee. Er ging ganz mutig auf den Drachen zu.'
'Konstantin|12|Bist du vielleicht kitzelig?'
'Erzähler|13|Bevor Donnerzahn antworten konnte, kitzelte Konstantin ihn sanft unter den Armen. Der Drache begann herzlich zu lachen.'
'Donnerzahn|14|Das ist ja wunderbar! Niemand hat mich jemals gekitzelt. Es fühlt sich so schön an!'
'Konstantin|15|Siehst du? Du bist gar nicht furchteinflößend. Du bist nett und freundlich.'
'Donnerzahn|16|Du hast recht, kleiner Ritter. Ich bin schon so lange allein hier oben. Ich wollte nur, dass jemand mit mir spielt.'
'Konstantin|17|Dann komm doch mit zu unserem Schloss! Dort wohnen Mama, Papa und meine große Schwester Iris.'
'Donnerzahn|18|Wirklich? Sie würden einen Drachen bei sich aufnehmen?'
'Konstantin|19|Natürlich! Wir sind eine freundliche Familie. Und den Schatz können wir auch mitnehmen.'
'Erzähler|20|So machten sich der kleine Ritter und der Drache gemeinsam auf den Weg zum Schloss. Der Goldschatz glitzerte in Donnerzahns Krallen.'
'Konstantin|21|Mama! Papa! Iris! Ich bringe einen neuen Freund mit!'
'Erzähler|22|Mama kam als erste aus dem Schloss gelaufen. Sie sah den großen Drachen und lächelte freundlich.'
'Mama|23|Willkommen in unserem Schloss, lieber Drache! Ich bin Konstantins Mama.'
'Donnerzahn|24|Ich heiße Donnerzahn und ich bin eigentlich ganz harmlos. Konstantin hat mir gezeigt, wie schön Freundschaft ist.'
'Erzähler|25|Papa kam dazu und klopfte dem Drachen freundschaftlich auf die Schulter.'
'Papa|26|Ein Drache als Freund! Das ist ja fantastisch. Du kannst gerne bei uns bleiben.'
'Erzähler|27|Iris, Konstantins große Schwester, kam neugierig näher und bestaunte den Drachen.'
'Iris|28|Wow, ein echter Drache! Kannst du wirklich Feuer spucken?'
'Donnerzahn|29|Ja, das kann ich! Aber ich verwende es nur für nützliche Dinge.'
'Konstantin|30|Können wir ein Fest feiern? Für unsere neue Freundschaft?'
'Mama|31|Das ist eine wunderbare Idee! Ich backe einen großen Kuchen für uns alle.'
'Erzähler|32|Bald duftete das ganze Schloss nach frisch gebackenem Kuchen. Mama trug ihn stolz in den großen Saal.'
'Papa|33|Oh nein! Ich habe vergessen, die Kerzen anzuzünden. Wo sind nur die Streichhölzer?'
'Donnerzahn|34|Das ist kein Problem! Dafür braucht ihr keine Streichhölzer.'
'Erzähler|35|Donnerzahn pustete ganz sanft über die Kerzen auf dem Kuchen. Kleine Flämmchen züngelten hervor und alle Kerzen brannten hell.'
'Iris|36|Das ist ja praktisch! Du bist der beste Kerzenanzünder der Welt!'
'Konstantin|37|Siehst du, Donnerzahn? Du bist nicht einsam. Du gehörst jetzt zu unserer Familie.'
'Donnerzahn|38|Das ist das schönste Geschenk, das ich je bekommen habe. Echte Freunde!'
'Erzähler|39|Sie aßen gemeinsam den köstlichen Kuchen und erzählten lustige Geschichten. Donnerzahn war überglücklich.'
'Mama|40|Von nun an ist Donnerzahn Teil unserer Familie. Es gibt immer Platz für einen neuen Freund.'
'Konstantin|41|Und wir werden gemeinsam viele Abenteuer erleben! Nie wieder musst du allein sein.'
'Erzähler|42|Von diesem Tag an lebte Donnerzahn glücklich im Schloss bei der Familie. Er war nie wieder einsam, denn er hatte die besten Freunde der Welt gefunden.'
)

TOTAL=${#LINES[@]}
echo "Processing $TOTAL lines..."

for entry in "${LINES[@]}"; do
  IFS='|' read -r speaker idx text <<< "$entry"
  voice_id="${VOICES[$speaker]}"
  outfile="$LINES_DIR/line_${idx}.mp3"
  tmpfile="$LINES_DIR/line_${idx}_raw.mp3"
  
  echo "[$((idx+1))/$TOTAL] Line $idx - $speaker ($voice_id)"
  
  curl -s -X POST "https://api.elevenlabs.io/v1/text-to-speech/${voice_id}" \
    -H "xi-api-key: ${API_KEY}" \
    -H "Content-Type: application/json" \
    -d "$(jq -n --arg text "$text" '{
      "text": $text,
      "model_id": "eleven_multilingual_v2",
      "voice_settings": {
        "stability": 0.35,
        "similarity_boost": 0.75,
        "style": 0.6,
        "use_speaker_boost": false
      }
    }')" \
    -o "$tmpfile"
  
  # Check if valid mp3
  if file "$tmpfile" | grep -q "Audio\|MPEG\|layer"; then
    # Normalize
    ffmpeg -y -i "$tmpfile" -af "loudnorm=I=-16:TP=-1.5:LRA=11" "$outfile" 2>/dev/null
    rm "$tmpfile"
    echo "  ✓ Done"
  else
    echo "  ✗ ERROR - not a valid audio file:"
    cat "$tmpfile"
    echo
    rm -f "$tmpfile"
    exit 1
  fi
  
  sleep 1
done

echo ""
echo "All lines generated. Combining..."

cd "$LINES_DIR"
ls line_*.mp3 | sort -t_ -k2 -n | sed "s/^/file '/" | sed "s/$/'/" > concat.txt

# Get total duration
DURATION=$(ffprobe -v error -show_entries format=duration -of csv=p=0 -f concat -safe 0 -i concat.txt 2>/dev/null || echo "0")
FADE_OUT_START=$(echo "$DURATION - 1" | bc 2>/dev/null || echo "0")

if [ "$FADE_OUT_START" = "0" ] || [ -z "$FADE_OUT_START" ]; then
  # Fallback: just combine without fade-out timing calc, use simple approach
  ffmpeg -y -f concat -safe 0 -i concat.txt -af "afade=t=in:d=0.5" combined.mp3 2>/dev/null
else
  ffmpeg -y -f concat -safe 0 -i concat.txt -af "afade=t=in:d=0.5,afade=t=out:st=${FADE_OUT_START}:d=1" combined.mp3 2>/dev/null
fi

cp combined.mp3 "$AUDIO_DIR/261949d0-938a-4b1a-a276-3b2328748109.mp3"
cp combined.mp3 "$AUDIO_DIR/5e447212-2936-43de-a96c-83f2b28e4173.mp3"

echo "✅ All done!"
echo "Combined audio: $AUDIO_DIR/261949d0-938a-4b1a-a276-3b2328748109.mp3"
echo "Copied to: $AUDIO_DIR/5e447212-2936-43de-a96c-83f2b28e4173.mp3"
