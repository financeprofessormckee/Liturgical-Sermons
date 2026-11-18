"use strict";

/*
 * calendar-1962.js — a resolver for the 1962 Missal (Extraordinary Form) temporal
 * cycle, a sibling to calendar.js. It exposes window.RESOLVE_DAY_1962 with the same
 * output contract as the modern RESOLVE_DAY, so app.js can swap calendars by pointing
 * window.RESOLVE_DAY at one or the other — nothing else in the app changes.
 *
 * Two deliberate differences from the modern resolver:
 *   - No lectionary `cycle`. The 1962 propers repeat every year (a one-year cycle),
 *     so the cycle letter the modern Ordinary-Time Sundays carry is simply omitted;
 *     app.js's resolveKeyFor already no-ops when `cycle` is undefined.
 *   - An extra `seasonLabel`. The 1962 seasons (Septuagesima, Time after Epiphany,
 *     Time after Pentecost, Passiontide…) don't map onto the five season *words*
 *     styles.css themes by. So `season` stays one of advent|christmas|lent|easter|
 *     ordinary (purely for the body theme + color), while `seasonLabel` carries the
 *     human season name for the day-card pill. The modern resolver sets no
 *     seasonLabel, so its pill is unchanged.
 *
 * V1 scope (mirrors the modern resolver's documented simplifications):
 *   - Temporal cycle Sundays + the marquee movable feasts, plus four fixed-date
 *     solemnities (Assumption, All Saints, All Souls, Immaculate Conception) that
 *     the modern calendar already authors with identical Graduale chant text — see
 *     the FIXED map below. The rest of the 1962 *sanctoral* (saints' days), octaves,
 *     commemorations, and impeded-feast transfers are out of scope — intentional
 *     gaps, not bugs.
 *   - Epiphany fixed to Jan 6; Ascension on Thursday; Corpus Christi on its Thursday;
 *     Christ the King on the last Sunday of October (the 1962 date).
 *
 * The KEYS it emits match data/introits-1962.js (window.INTROITS_1962).
 */

(function () {
  var DAY = 86400000;

  function ymd(y, m, d) { return new Date(Date.UTC(y, m - 1, d)); } // m is 1-based
  function addDays(date, n) { return new Date(date.getTime() + n * DAY); }
  function dow(date) { return date.getUTCDay(); } // 0 = Sunday
  function daysBetween(a, b) { return Math.round((b - a) / DAY); }
  function weeksBetween(a, b) { return Math.round((b - a) / DAY / 7); }
  function iso(date) {
    return (
      date.getUTCFullYear() + "-" +
      String(date.getUTCMonth() + 1).padStart(2, "0") + "-" +
      String(date.getUTCDate()).padStart(2, "0")
    );
  }
  function sameDay(a, b) { return iso(a) === iso(b); }
  function sundayOnOrBefore(date) { return addDays(date, -dow(date)); }
  function nextSunday(date) { // strictly after `date`
    var off = 7 - dow(date);
    return addDays(date, off === 0 ? 7 : off);
  }

  // Gregorian Easter — Meeus/Jones/Butcher algorithm (same as calendar.js).
  function easter(year) {
    var a = year % 19, b = Math.floor(year / 100), c = year % 100;
    var d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
    var g = Math.floor((b - f + 1) / 3);
    var h = (19 * a + b - d - g + 15) % 30;
    var i = Math.floor(c / 4), k = c % 4;
    var l = (32 + 2 * e + 2 * i - h - k) % 7;
    var mm = Math.floor((a + 11 * h + 22 * l) / 451);
    var month = Math.floor((h + l - 7 * mm + 114) / 31);
    var day = ((h + l - 7 * mm + 114) % 31) + 1;
    return ymd(year, month, day);
  }

  // Fixed-date sanctoral feasts for the 1962 Missal, keyed "M-D" -> record.
  // Mirrors calendar.js's SANCTORAL mechanism (calendar.js:139-170). The five
  // entries carried over from the V1 FIXED map (Assumption, Sorrows, All Saints,
  // All Souls, Immaculate Conception) share identical Graduale chant text with
  // the modern calendar; everything else is wired incrementally via the DO
  // Sancti-file method documented in sources/gregobase/1962-sanctoral-worklist.md.
  var SANCTORAL_1962 = {
    "1-20": { key: "fabian-sebastian", title: "Sts. Fabian and Sebastian, Martyrs", rank: "Duplex", color: "red", link: "https://en.wikipedia.org/wiki/Saint_Sebastian" },
    "2-2": { key: "candlemas", title: "The Purification of the Blessed Virgin Mary (Candlemas)", rank: "Feast", color: "white", link: "https://en.wikipedia.org/wiki/Presentation_of_Jesus_at_the_Temple" },
    "2-12": { key: "seven-founders", title: "Ss. Seven Founders of the Servite Order, Confessors", rank: "Duplex", color: "white", link: "https://en.wikipedia.org/wiki/Seven_Holy_Founders_of_the_Servite_Order" },
    "2-24": { key: "common-apostles", orationsKey: "matthias", title: "St. Matthias, Apostle", rank: "Duplex II classis", color: "red", link: "https://en.wikipedia.org/wiki/Matthias" },
    "3-19": { key: "joseph", title: "St. Joseph, Spouse of the Blessed Virgin Mary", rank: "Duplex I classis", color: "white", link: "https://en.wikipedia.org/wiki/Saint_Joseph" },
    "3-25": { key: "annunciation", title: "The Annunciation of the Blessed Virgin Mary", rank: "Duplex I classis", color: "white", link: "https://en.wikipedia.org/wiki/Annunciation" },
    "6-5": { key: "boniface", title: "St. Boniface, Bishop and Martyr", rank: "Duplex", color: "red", link: "https://en.wikipedia.org/wiki/Saint_Boniface" },
    "6-11": { key: "common-apostles", orationsKey: "barnabas", title: "St. Barnabas, Apostle", rank: "Duplex majus", color: "red", link: "https://en.wikipedia.org/wiki/Barnabas" },
    "6-23": { key: "john-baptist-vigil", title: "The Nativity of St. John the Baptist (Vigil)", rank: "Duplex II classis", color: "violet", link: "https://en.wikipedia.org/wiki/Nativity_of_John_the_Baptist" },
    "6-24": { key: "john-baptist", title: "The Nativity of St. John the Baptist", rank: "Duplex I classis", color: "white", link: "https://en.wikipedia.org/wiki/Nativity_of_John_the_Baptist" },
    "6-28": { key: "peter-paul-vigil", title: "Sts. Peter and Paul, Apostles (Vigil)", rank: "Duplex II classis", color: "violet", link: "https://en.wikipedia.org/wiki/Feast_of_Saints_Peter_and_Paul" },
    "6-29": { key: "peter-paul", title: "Sts. Peter and Paul, Apostles", rank: "Duplex I classis", color: "red", link: "https://en.wikipedia.org/wiki/Feast_of_Saints_Peter_and_Paul" },
    "7-2": { key: "visitation", title: "The Visitation of the Blessed Virgin Mary", rank: "Duplex II classis", color: "white", link: "https://en.wikipedia.org/wiki/Visitation_(Christianity)" },
    "7-25": { key: "common-apostles", orationsKey: "james-apostle", title: "St. James, Apostle", rank: "Duplex II classis", color: "red", link: "https://en.wikipedia.org/wiki/James,_son_of_Zebedee" },
    "7-30": { key: "abdon-sennen", title: "Sts. Abdon and Sennen, Martyrs", rank: "Simplex", color: "red", link: "https://en.wikipedia.org/wiki/Abdon_and_Sennen" },
    "8-6": { key: "transfiguration", title: "The Transfiguration of the Lord", rank: "Duplex II classis", color: "white", link: "https://en.wikipedia.org/wiki/Transfiguration_of_Jesus" },
    "8-10": { key: "lawrence", title: "St. Lawrence, Deacon and Martyr", rank: "Duplex II classis", color: "red", link: "https://en.wikipedia.org/wiki/Lawrence_of_Rome" },
    "8-14": { key: "assumption-vigil", title: "The Assumption of the Blessed Virgin Mary (Vigil)", rank: "Simplex", color: "violet", link: "https://en.wikipedia.org/wiki/Assumption_of_Mary" },
    "8-15": { key: "assumption", title: "The Assumption of the Blessed Virgin Mary", rank: "Solemnity", link: "https://en.wikipedia.org/wiki/Assumption_of_Mary" },
    "8-24": { key: "common-apostles", orationsKey: "bartholomew", title: "St. Bartholomew, Apostle", rank: "Duplex II classis", color: "red", link: "https://en.wikipedia.org/wiki/Bartholomew_the_Apostle" },
    "9-8": { key: "nativity-mary", title: "The Nativity of the Blessed Virgin Mary", rank: "Duplex II classis", color: "white", link: "https://en.wikipedia.org/wiki/Nativity_of_Mary" },
    "9-14": { key: "triumph-cross", title: "The Exaltation of the Holy Cross", rank: "Duplex II classis", color: "red", link: "https://en.wikipedia.org/wiki/Feast_of_the_Cross" },
    "9-15": { key: "sorrows", title: "The Seven Sorrows of the Blessed Virgin Mary", rank: "Feast", color: "white", link: "https://en.wikipedia.org/wiki/Our_Lady_of_Sorrows" },
    "9-21": { key: "matthew", title: "St. Matthew, Apostle and Evangelist", rank: "Duplex II classis", color: "red", link: "https://en.wikipedia.org/wiki/Matthew_the_Apostle" },
    "9-29": { key: "archangels", title: "Sts. Michael, Gabriel and Raphael, Archangels", rank: "Duplex I classis", color: "white", link: "https://en.wikipedia.org/wiki/Michaelmas" },
    "10-18": { key: "common-apostles", orationsKey: "luke", title: "St. Luke, Evangelist", rank: "Duplex II classis", color: "red", link: "https://en.wikipedia.org/wiki/Luke_the_Evangelist" },
    "10-28": { key: "common-apostles", orationsKey: "simon-jude", title: "Sts. Simon and Jude, Apostles", rank: "Duplex II classis", color: "red", link: "https://en.wikipedia.org/wiki/Jude_the_Apostle" },
    "11-1": { key: "all-saints", title: "All Saints", rank: "Solemnity", link: "https://en.wikipedia.org/wiki/All_Saints%27_Day" },
    "11-2": { key: "requiem", title: "The Commemoration of All the Faithful Departed (All Souls)",
      rank: "Feast", color: "violet", link: "https://en.wikipedia.org/wiki/All_Souls%27_Day" },
    "11-9": { key: "dedication-lateran", title: "The Dedication of the Archbasilica of Our Savior (St. John Lateran)",
      rank: "Duplex II classis", color: "white", link: "https://en.wikipedia.org/wiki/Archbasilica_of_Saint_John_Lateran" },
    "11-14": { key: "josaphat", title: "St. Josaphat, Bishop and Martyr", rank: "Duplex", color: "red", link: "https://en.wikipedia.org/wiki/Josaphat_Kuntsevych" },
    "11-18": { key: "dedication-lateran", title: "The Dedication of the Basilicas of Sts. Peter and Paul, Apostles",
      rank: "Duplex majus", color: "white", link: "https://en.wikipedia.org/wiki/St._Peter%27s_Basilica" },
    "11-30": { key: "andrew", title: "St. Andrew, Apostle", rank: "Duplex II classis", color: "red", link: "https://en.wikipedia.org/wiki/Andrew_the_Apostle" },
    "12-8": { key: "immaculate-conception", title: "The Immaculate Conception of the Blessed Virgin Mary",
      rank: "Solemnity", link: "https://en.wikipedia.org/wiki/Immaculate_Conception" },
    "12-21": { key: "thomas-apostle", title: "St. Thomas, Apostle", rank: "Duplex II classis", color: "red", link: "https://en.wikipedia.org/wiki/Thomas_the_Apostle" },
    "12-26": { key: "stephen", title: "St. Stephen, the First Martyr", rank: "Duplex II classis", color: "red", link: "https://en.wikipedia.org/wiki/Saint_Stephen" },
    "12-27": { key: "john-evangelist", title: "St. John, Apostle and Evangelist", rank: "Duplex II classis", color: "white", link: "https://en.wikipedia.org/wiki/John_the_Evangelist" },
    "12-28": { key: "holy-innocents", title: "The Holy Innocents, Martyrs", rank: "Duplex II classis", color: "violet", link: "https://en.wikipedia.org/wiki/Massacre_of_the_Innocents" }
  };
  function fixedFeast(date) {
    return SANCTORAL_1962[(date.getUTCMonth() + 1) + "-" + date.getUTCDate()] || null;
  }

  // "Lesser" 1962 saints — well-known feasts/commemorations with no Mass propers
  // of their own, so `key` points straight at a Common-of-Saints category (see
  // data/common-introits.js / data/common-propers.js), same mechanism as
  // calendar.js's LESSER table (calendar.js:172-197). Gated by `!isSun`
  // everywhere checked: a 1962 simplex/semiduplex/duplex feast never outranks a
  // Sunday Mass in this simplified model.
  var LESSER_1962 = {
    "1-14": { key: "common-confessor-doctor", orationsKey: "hilary", title: "St. Hilary, Bishop, Confessor and Doctor of the Church", rank: "Duplex", link: "https://en.wikipedia.org/wiki/Hilary_of_Poitiers" },
    "1-16": { key: "common-martyr-bishop", orationsKey: "marcellus", title: "St. Marcellus, Pope and Martyr", rank: "Semiduplex", link: "https://en.wikipedia.org/wiki/Pope_Marcellus_I" },
    "1-22": { key: "common-several-martyrs", orationsKey: "vincent-anastasius", title: "Sts. Vincent and Anastasius, Martyrs", rank: "Semiduplex", link: "https://en.wikipedia.org/wiki/Vincent_of_Saragossa" },
    "1-24": { key: "common-martyr-2", orationsKey: "timothy", title: "St. Timothy, Bishop and Martyr", rank: "Duplex", link: "https://en.wikipedia.org/wiki/Saint_Timothy" },
    "1-26": { key: "common-martyr-2", orationsKey: "polycarp", title: "St. Polycarp, Bishop and Martyr", rank: "Duplex", link: "https://en.wikipedia.org/wiki/Polycarp" },
    "1-28": { key: "common-confessor", orationsKey: "peter-nolasco", title: "St. Peter Nolasco, Confessor", rank: "Duplex", link: "https://en.wikipedia.org/wiki/Peter_Nolasco" },
    "1-29": { key: "common-confessor-doctor", orationsKey: "francis-de-sales", title: "St. Francis de Sales, Bishop, Confessor and Doctor of the Church", rank: "Duplex", link: "https://en.wikipedia.org/wiki/Francis_de_Sales" },
    "1-30": { key: "common-virgin-martyr", orationsKey: "martina", title: "St. Martina, Virgin and Martyr", rank: "Semiduplex", link: "https://en.wikipedia.org/wiki/Martina_of_Rome" },
    "2-3": { key: "common-martyr-2", orationsKey: "blaise", title: "St. Blaise, Bishop and Martyr", rank: "Duplex", link: "https://en.wikipedia.org/wiki/Saint_Blaise" },
    "2-4": { key: "common-confessor-bishop", orationsKey: "andrew-corsini", title: "St. Andrew Corsini, Bishop and Confessor", rank: "Duplex", link: "https://en.wikipedia.org/wiki/Andrew_Corsini" },
    "2-5": { key: "common-virgin-martyr", orationsKey: "agatha", title: "St. Agatha, Virgin and Martyr", rank: "Duplex", link: "https://en.wikipedia.org/wiki/Agatha_of_Sicily" },
    "2-8": { key: "common-confessor", orationsKey: "john-of-matha", title: "St. John of Matha, Confessor", rank: "Duplex", link: "https://en.wikipedia.org/wiki/John_of_Matha" },
    "2-9": { key: "common-confessor-doctor", orationsKey: "cyril-alexandria", title: "St. Cyril of Alexandria, Bishop, Confessor and Doctor of the Church", rank: "Duplex", link: "https://en.wikipedia.org/wiki/Cyril_of_Alexandria" },
    "2-10": { key: "common-virgin", orationsKey: "scholastica", title: "St. Scholastica, Virgin", rank: "Duplex", link: "https://en.wikipedia.org/wiki/Scholastica" },
    "2-14": { key: "common-martyr-3", orationsKey: "valentine", title: "St. Valentine, Priest and Martyr", rank: "Simplex", link: "https://en.wikipedia.org/wiki/Saint_Valentine" },
    "2-18": { key: "common-martyr-2", orationsKey: "simeon", title: "St. Simeon, Bishop and Martyr", rank: "Simplex", link: "https://en.wikipedia.org/wiki/Simeon_of_Jerusalem" },
    "3-4": { key: "common-confessor", orationsKey: "casimir", title: "St. Casimir, Confessor", rank: "Semiduplex", link: "https://en.wikipedia.org/wiki/Saint_Casimir" },
    "3-7": { key: "common-confessor-doctor", orationsKey: "thomas-aquinas", title: "St. Thomas Aquinas, Confessor and Doctor of the Church", rank: "Duplex", link: "https://en.wikipedia.org/wiki/Thomas_Aquinas" },
    "3-8": { key: "common-confessor", orationsKey: "john-of-god", title: "St. John of God, Confessor", rank: "Duplex", link: "https://en.wikipedia.org/wiki/John_of_God_(saint)" },
    "3-12": { key: "common-confessor-doctor", orationsKey: "gregory-great", title: "St. Gregory the Great, Pope, Confessor and Doctor of the Church", rank: "Duplex", link: "https://en.wikipedia.org/wiki/Pope_Gregory_I" },
    "3-17": { key: "common-confessor-bishop", orationsKey: "patrick", title: "St. Patrick, Bishop and Confessor", rank: "Duplex", link: "https://en.wikipedia.org/wiki/Saint_Patrick" },
    "3-18": { key: "common-confessor-doctor", orationsKey: "cyril-jerusalem", title: "St. Cyril of Jerusalem, Bishop, Confessor and Doctor of the Church", rank: "Duplex", link: "https://en.wikipedia.org/wiki/Cyril_of_Jerusalem" },
    "4-2": { key: "common-confessor", orationsKey: "francis-of-paola", title: "St. Francis of Paola, Confessor", rank: "Simplex", link: "https://en.wikipedia.org/wiki/Francis_of_Paola" },
    "4-4": { key: "common-confessor-doctor", orationsKey: "isidore", title: "St. Isidore, Bishop, Confessor and Doctor of the Church", rank: "Duplex", link: "https://en.wikipedia.org/wiki/Isidore_of_Seville" },
    "4-5": { key: "common-confessor", orationsKey: "vincent-ferrer", title: "St. Vincent Ferrer, Confessor", rank: "Duplex", link: "https://en.wikipedia.org/wiki/Vincent_Ferrer" },
    "4-17": { key: "common-martyr-bishop", orationsKey: "anicetus", title: "St. Anicetus, Pope and Martyr", rank: "Simplex", link: "https://en.wikipedia.org/wiki/Pope_Anicetus" },
    "4-21": { key: "common-confessor-doctor", orationsKey: "anselm", title: "St. Anselm, Bishop, Confessor and Doctor of the Church", rank: "Duplex", link: "https://en.wikipedia.org/wiki/Anselm_of_Canterbury" },
    "4-27": { key: "common-confessor-doctor", orationsKey: "peter-canisius", title: "St. Peter Canisius, Confessor and Doctor of the Church", rank: "Duplex", link: "https://en.wikipedia.org/wiki/Peter_Canisius" },
    "4-30": { key: "common-virgin", orationsKey: "catherine-siena", title: "St. Catherine of Siena, Virgin", rank: "Duplex", link: "https://en.wikipedia.org/wiki/Catherine_of_Siena" },
    "5-7": { key: "common-martyr-2", orationsKey: "stanislaus", title: "St. Stanislaus, Bishop and Martyr", rank: "Duplex", link: "https://en.wikipedia.org/wiki/Stanislaus_of_Szczepan%C3%B3w" },
    "5-9": { key: "common-confessor-doctor", orationsKey: "gregory-nazianzen", title: "St. Gregory Nazianzen, Bishop, Confessor and Doctor of the Church", rank: "Duplex", link: "https://en.wikipedia.org/wiki/Gregory_of_Nazianzus" },
    "5-10": { key: "common-confessor-bishop", orationsKey: "antoninus", title: "St. Antoninus, Bishop and Confessor", rank: "Duplex", link: "https://en.wikipedia.org/wiki/Antoninus_of_Florence" },
    "5-16": { key: "common-confessor-bishop", orationsKey: "ubaldus", title: "St. Ubaldus, Bishop and Confessor", rank: "Semiduplex", link: "https://en.wikipedia.org/wiki/Ubald" },
    "5-17": { key: "common-confessor", orationsKey: "paschal-baylon", title: "St. Paschal Baylon, Confessor", rank: "Duplex", link: "https://en.wikipedia.org/wiki/Paschal_Bayl%C3%B3n" },
    "5-23": { key: "common-confessor", orationsKey: "john-baptist-de-rossi", title: "St. John Baptist de Rossi, Confessor", rank: "Duplex", link: "https://en.wikipedia.org/wiki/John_Baptist_de_Rossi" },
    "5-29": { key: "common-virgin", orationsKey: "mary-magdalene-de-pazzi", title: "St. Mary Magdalene de Pazzi, Virgin", rank: "Semiduplex", link: "https://en.wikipedia.org/wiki/Mary_Magdalene_de%27_Pazzi" },
    "5-30": { key: "common-martyr-bishop", orationsKey: "felix-i", title: "St. Felix I, Pope and Martyr", rank: "Simplex", link: "https://en.wikipedia.org/wiki/Pope_Felix_I" },
    "6-1": { key: "common-virgin", orationsKey: "angela-merici", title: "St. Angela Merici, Virgin", rank: "Duplex", link: "https://en.wikipedia.org/wiki/Angela_Merici" },
    "6-6": { key: "common-confessor-bishop", orationsKey: "norbert", title: "St. Norbert, Bishop and Confessor", rank: "Duplex", link: "https://en.wikipedia.org/wiki/Norbert_of_Xanten" },
    "6-13": { key: "common-confessor-doctor", orationsKey: "anthony-padua", title: "St. Anthony of Padua, Confessor and Doctor of the Church", rank: "Duplex", link: "https://en.wikipedia.org/wiki/Anthony_of_Padua" },
    "6-18": { key: "common-confessor-doctor", orationsKey: "ephraem", title: "St. Ephraem, Confessor and Doctor of the Church", rank: "Duplex", link: "https://en.wikipedia.org/wiki/Ephrem_the_Syrian" },
    "6-19": { key: "common-virgin", orationsKey: "juliana-falconieri", title: "St. Juliana Falconieri, Virgin", rank: "Duplex", link: "https://en.wikipedia.org/wiki/Juliana_Falconieri" },
    "6-20": { key: "common-martyr-bishop", orationsKey: "silverius", title: "St. Silverius, Pope and Martyr", rank: "Simplex", link: "https://en.wikipedia.org/wiki/Pope_Silverius" },
    "7-11": { key: "common-martyr-bishop", orationsKey: "pius-i", title: "St. Pius I, Pope and Martyr", rank: "Simplex", link: "https://en.wikipedia.org/wiki/Pope_Pius_I" },
    "7-13": { key: "common-pope", orationsKey: "anacletus", title: "St. Anacletus, Pope and Martyr", rank: "Semiduplex", link: "https://en.wikipedia.org/wiki/Pope_Anacletus" },
    "7-19": { key: "common-confessor", orationsKey: "vincent-de-paul", title: "St. Vincent de Paul, Confessor", rank: "Duplex", link: "https://en.wikipedia.org/wiki/Vincent_de_Paul" },
    "7-29": { key: "common-virgin", orationsKey: "martha", title: "St. Martha, Virgin", rank: "Duplex", link: "https://en.wikipedia.org/wiki/Martha" },
    "8-9": { key: "common-confessor", orationsKey: "john-mary-vianney", title: "St. John Mary Vianney, Confessor", rank: "Duplex", link: "https://en.wikipedia.org/wiki/Jean_Vianney" },
    "8-12": { key: "common-virgin", orationsKey: "clare", title: "St. Clare, Virgin", rank: "Duplex", link: "https://en.wikipedia.org/wiki/Clare_of_Assisi" },
    "8-17": { key: "common-confessor", orationsKey: "hyacinth", title: "St. Hyacinth, Confessor", rank: "Duplex", link: "https://en.wikipedia.org/wiki/Hyacinth_of_Poland" },
    "8-19": { key: "common-confessor", orationsKey: "john-eudes", title: "St. John Eudes, Confessor", rank: "Duplex", link: "https://en.wikipedia.org/wiki/John_Eudes" },
    "8-23": { key: "common-confessor", orationsKey: "philip-benizi", title: "St. Philip Benizi, Confessor", rank: "Duplex", link: "https://en.wikipedia.org/wiki/Philip_Benizi_de_Damiani" },
    "8-26": { key: "common-martyr-bishop", orationsKey: "zephyrinus", title: "St. Zephyrinus, Pope and Martyr", rank: "Simplex", link: "https://en.wikipedia.org/wiki/Pope_Zephyrinus" },
    "8-30": { key: "common-virgin", orationsKey: "rose-of-lima", title: "St. Rose of Lima, Virgin", rank: "Duplex", link: "https://en.wikipedia.org/wiki/Rose_of_Lima" },
    "8-31": { key: "common-confessor", orationsKey: "raymond-nonnatus", title: "St. Raymond Nonnatus, Confessor", rank: "Duplex", link: "https://en.wikipedia.org/wiki/Raymond_Nonnatus" },
    "9-10": { key: "common-confessor", orationsKey: "nicholas-tolentino", title: "St. Nicholas of Tolentino, Confessor", rank: "Semiduplex", link: "https://en.wikipedia.org/wiki/Nicholas_of_Tolentino" },
    "9-11": { key: "common-several-martyrs", orationsKey: "protus-hyacinth", title: "Sts. Protus and Hyacinth, Martyrs", rank: "Simplex", link: "https://en.wikipedia.org/wiki/Protus_and_Hyacinth" },
    "9-19": { key: "common-several-martyrs", orationsKey: "januarius", title: "St. Januarius, Bishop, and Companions, Martyrs", rank: "Semiduplex", link: "https://en.wikipedia.org/wiki/Januarius" },
    "10-6": { key: "common-confessor", orationsKey: "bruno", title: "St. Bruno, Confessor", rank: "Duplex", link: "https://en.wikipedia.org/wiki/Bruno_of_Cologne" },
    "10-13": { key: "common-confessor", orationsKey: "edward-confessor", title: "St. Edward the Confessor, King", rank: "Semiduplex", link: "https://en.wikipedia.org/wiki/Edward_the_Confessor" },
    "10-14": { key: "common-martyr-bishop", orationsKey: "callistus-i", title: "St. Callistus I, Pope and Martyr", rank: "Simplex", link: "https://en.wikipedia.org/wiki/Pope_Callixtus_I" },
    "10-15": { key: "common-virgin", orationsKey: "teresa-avila", title: "St. Teresa of Ávila, Virgin", rank: "Duplex", link: "https://en.wikipedia.org/wiki/Teresa_of_%C3%81vila" },
    "10-19": { key: "common-confessor", orationsKey: "peter-alcantara", title: "St. Peter of Alcantara, Confessor", rank: "Duplex", link: "https://en.wikipedia.org/wiki/Peter_of_Alc%C3%A1ntara" },
    "10-26": { key: "common-martyr-bishop", orationsKey: "evaristus", title: "St. Evaristus, Pope and Martyr", rank: "Simplex", link: "https://en.wikipedia.org/wiki/Pope_Evaristus" },
    "11-10": { key: "common-confessor", orationsKey: "andrew-avellino", title: "St. Andrew Avellino, Confessor", rank: "Duplex", link: "https://en.wikipedia.org/wiki/Andrew_Avellino" },
    "11-11": { key: "common-confessor-bishop", orationsKey: "martin-of-tours", title: "St. Martin of Tours, Bishop and Confessor", rank: "Duplex", link: "https://en.wikipedia.org/wiki/Martin_of_Tours" },
    "11-12": { key: "common-martyr-bishop", orationsKey: "martin-i", title: "St. Martin I, Pope and Martyr", rank: "Semiduplex", link: "https://en.wikipedia.org/wiki/Pope_Martin_I" },
    "11-13": { key: "common-confessor", orationsKey: "didacus", title: "St. Didacus, Confessor", rank: "Semiduplex", link: "https://en.wikipedia.org/wiki/Didacus_of_Alcal%C3%A1" },
    "11-16": { key: "common-virgin", orationsKey: "gertrude", title: "St. Gertrude, Virgin", rank: "Duplex", link: "https://en.wikipedia.org/wiki/Gertrude_the_Great" },
    "11-17": { key: "common-confessor-bishop", orationsKey: "gregory-thaumaturgus", title: "St. Gregory Thaumaturgus, Bishop and Confessor", rank: "Duplex", link: "https://en.wikipedia.org/wiki/Gregory_Thaumaturgus" },
    "11-20": { key: "common-confessor", orationsKey: "felix-of-valois", title: "St. Felix of Valois, Confessor", rank: "Duplex", link: "https://en.wikipedia.org/wiki/Felix_of_Valois" },
    "11-22": { key: "common-virgin-martyr", orationsKey: "cecilia", title: "St. Cecilia, Virgin and Martyr", rank: "Duplex", link: "https://en.wikipedia.org/wiki/Cecilia_of_Rome" },
    "11-23": { key: "common-martyr-bishop", orationsKey: "clement-i", title: "St. Clement I, Pope and Martyr", rank: "Duplex", link: "https://en.wikipedia.org/wiki/Clement_of_Rome" },
    "11-24": { key: "common-confessor-doctor", orationsKey: "john-of-the-cross", title: "St. John of the Cross, Confessor and Doctor of the Church", rank: "Duplex", link: "https://en.wikipedia.org/wiki/John_of_the_Cross" },
    "11-25": { key: "common-virgin-martyr", orationsKey: "catherine-alexandria", title: "St. Catherine of Alexandria, Virgin and Martyr", rank: "Duplex", link: "https://en.wikipedia.org/wiki/Catherine_of_Alexandria" },
    "12-7": { key: "common-confessor-doctor", orationsKey: "ambrose", title: "St. Ambrose, Bishop, Confessor and Doctor of the Church", rank: "Duplex", link: "https://en.wikipedia.org/wiki/Ambrose" },
    "12-11": { key: "common-pope", orationsKey: "damasus", title: "St. Damasus I, Pope and Confessor", rank: "Duplex", link: "https://en.wikipedia.org/wiki/Pope_Damasus_I" },
    "12-13": { key: "lucy", commonKey: "common-virgin", orationsKey: "lucy", title: "St. Lucy, Virgin and Martyr", rank: "Semiduplex", link: "https://en.wikipedia.org/wiki/Lucy_of_Syracuse" },
    "12-16": { key: "common-martyr-2", orationsKey: "eusebius", title: "St. Eusebius, Bishop and Martyr", rank: "Semiduplex", link: "https://en.wikipedia.org/wiki/Eusebius_of_Vercelli" },
  };
  function lesserFeast(date) {
    return LESSER_1962[(date.getUTCMonth() + 1) + "-" + date.getUTCDate()] || null;
  }

  var ORDINAL = [
    "", "First", "Second", "Third", "Fourth", "Fifth", "Sixth", "Seventh", "Eighth",
    "Ninth", "Tenth", "Eleventh", "Twelfth", "Thirteenth", "Fourteenth", "Fifteenth",
    "Sixteenth", "Seventeenth", "Eighteenth", "Nineteenth", "Twentieth",
    "Twenty-first", "Twenty-second", "Twenty-third", "Twenty-fourth", "Twenty-fifth",
    "Twenty-sixth", "Twenty-seventh", "Twenty-eighth"
  ];
  function ordinal(n) { return ORDINAL[n] || (n + "th"); }
  var WEEKDAY = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  // Anchor dates for one civil year's worth of the 1962 calendar.
  function anchors(year) {
    var e = easter(year);
    var adventFour = sundayOnOrBefore(ymd(year, 12, 24));
    var adventOne = addDays(adventFour, -21);
    // Sunday within the Octave of the Nativity (Dec 26–31). If Christmas is itself a
    // Sunday there is no such Sunday, so its Mass moves to Dec 30.
    var sundayOctave = sundayOnOrBefore(ymd(year, 12, 31));
    if (sameDay(sundayOctave, ymd(year, 12, 25))) sundayOctave = ymd(year, 12, 30);
    // The Most Holy Name of Jesus: the Sunday falling Jan 2–5 (between the
    // Circumcision and the Epiphany). Some years no Sunday lands there.
    var holyName = nextSunday(ymd(year, 1, 1)); // first Sunday strictly after Jan 1
    if (daysBetween(ymd(year, 1, 1), holyName) > 4) holyName = null;
    return {
      year: year,
      easter: e,
      septuagesima: addDays(e, -63),
      sexagesima: addDays(e, -56),
      quinquagesima: addDays(e, -49),
      ashWednesday: addDays(e, -46),
      lentOne: nextSunday(addDays(e, -46)),  // first Sunday of Lent (Easter − 42)
      palmSunday: addDays(e, -7),
      easterSun: e,
      ascension: addDays(e, 39),            // Thursday
      sundayAfterAscension: addDays(e, 42),
      pentecost: addDays(e, 49),
      trinity: addDays(e, 56),
      corpusChristi: addDays(e, 60),        // Thursday after Trinity
      sacredHeart: addDays(e, 68),          // Friday after the octave of Corpus Christi
      epiphany: ymd(year, 1, 6),
      christmas: ymd(year, 12, 25),
      holyFamily: nextSunday(ymd(year, 1, 6)), // Sunday within the octave of Epiphany
      sundayOctaveNativity: sundayOctave,
      holyName: holyName,
      adventOne: adventOne,
      adventFour: adventFour,
      lastAfterPentecost: addDays(adventOne, -7),
      christKing: sundayOnOrBefore(ymd(year, 10, 31)) // last Sunday of October
    };
  }

  function resolve(input) {
    var date;
    if (input instanceof Date) {
      date = ymd(input.getFullYear(), input.getMonth() + 1, input.getDate());
    } else if (typeof input === "string") {
      var p = input.split("-");
      date = ymd(Number(p[0]), Number(p[1]), Number(p[2]));
    } else {
      var now = new Date();
      date = ymd(now.getFullYear(), now.getMonth() + 1, now.getDate());
    }

    var Y = date.getUTCFullYear();
    var A = anchors(Y);
    var isSun = dow(date) === 0;

    function out(o) {
      o.date = iso(date);
      o.isSunday = isSun;
      if (!o.rank) o.rank = isSun ? "Sunday" : "Feria";
      if (o.dayKey === undefined) o.dayKey = null;
      if (o.sundayKey === undefined) o.sundayKey = null;
      return o;
    }

    // ---- Fixed marquee feasts ----
    if (sameDay(date, A.christmas)) {
      return out({ title: "The Nativity of the Lord", season: "christmas", seasonLabel: "Christmastide",
        color: "white", rank: "Solemnity", dayKey: "puer-natus", seasonKey: "season-christmas",
        options: [{ label: "Midnight", key: "dominus-dixit" }, { label: "Dawn", key: "lux-fulgebit" },
          { label: "Day", key: "puer-natus" }], link: "https://en.wikipedia.org/wiki/Christmas" });
    }
    if (date.getUTCMonth() === 11 && date.getUTCDate() === 24) { // Dec 24
      return out({ title: "The Nativity of the Lord (Vigil)", season: "christmas", seasonLabel: "Advent",
        color: "white", rank: "Solemnity", dayKey: "christmas-vigil", seasonKey: "season-christmas",
        link: "https://en.wikipedia.org/wiki/Christmas_Eve" });
    }
    if (date.getUTCMonth() === 0 && date.getUTCDate() === 1) { // Jan 1
      // dayKey stays "puer-natus" — the sung Introit/Gradual/Offertory/Communion
      // are textually identical to Christmas Day's (both @Tempora/Nat30 in the
      // source). But the Collect/Secret/Postcommunion are genuinely different
      // (Sancti-01-01.txt), so orationsKey overrides just the spoken-propers
      // lookup (see pickOrations in app.js).
      return out({ title: "The Circumcision of the Lord", season: "christmas", seasonLabel: "Christmastide",
        color: "white", rank: "Solemnity", dayKey: "puer-natus", orationsKey: "circumcision",
        seasonKey: "season-christmas",
        link: "https://en.wikipedia.org/wiki/Feast_of_the_Circumcision_of_Christ" });
    }
    if (sameDay(date, A.epiphany)) {
      return out({ title: "The Epiphany of the Lord", season: "christmas", seasonLabel: "Christmastide",
        color: "white", rank: "Solemnity", dayKey: "ecce-advenit", seasonKey: "season-christmas",
        link: "https://en.wikipedia.org/wiki/Epiphany_(holiday)" });
    }

    // ---- Advent (Advent I .. Dec 23) ----
    if (date >= A.adventOne && date <= ymd(Y, 12, 24)) {
      var aw = 1 + weeksBetween(A.adventOne, sundayOnOrBefore(date));
      var akey = "ad-te-levavi", acolor = "violet";
      if (aw === 2) akey = "populus-sion";
      else if (aw === 3) { akey = "gaudete"; acolor = "rose"; }
      else if (aw === 4) akey = "rorate";
      // The Immaculate Conception (Dec 8) displaces an Advent weekday, but an
      // Advent Sunday outranks it (mirrors calendar.js's Advent/sanctoral rule).
      if (!isSun) {
        var adf = fixedFeast(date); if (adf) {
          return out({ title: adf.title, season: "advent", seasonLabel: "Advent",
            color: adf.color || "white", rank: adf.rank, dayKey: adf.key, orationsKey: adf.orationsKey, commonKey: adf.commonKey,
            seasonKey: "season-advent", link: adf.link });
        }
        var adl = lesserFeast(date); if (adl) {
          return out({ title: adl.title, season: "advent", seasonLabel: "Advent",
            color: adl.color || "white", rank: adl.rank, dayKey: adl.key, orationsKey: adl.orationsKey, commonKey: adl.commonKey,
            seasonKey: "season-advent", link: adl.link });
        }
      }
      return out({ title: ferial(aw, "of Advent", date, isSun), season: "advent", seasonLabel: "Advent",
        color: acolor, dayKey: isSun ? akey : null, sundayKey: akey, seasonKey: "season-advent" });
    }

    // ---- Christmastide (Dec 25 .. Jan 6); Jan 1 & Jan 6 handled above ----
    if (date >= A.christmas || date <= A.epiphany) {
      if (sameDay(date, A.sundayOctaveNativity)) {
        return out({ title: "Sunday within the Octave of the Nativity", season: "christmas",
          seasonLabel: "Christmastide", color: "white", rank: "Sunday",
          dayKey: "sunday-octave-nativity", seasonKey: "season-christmas" });
      }
      if (A.holyName && sameDay(date, A.holyName)) {
        return out({ title: "The Most Holy Name of Jesus", season: "christmas",
          seasonLabel: "Christmastide", color: "white", rank: "Feast",
          dayKey: "holy-name", seasonKey: "season-christmas" });
      }
      // Fixed feasts within Christmastide (Stephen/John/Innocents Dec 26-28,
      // Sylvester Dec 31, etc.) displace a Christmas-Time weekday, but a Sunday
      // (Holy Family or the Sunday within the Octave, already handled above)
      // outranks them (mirrors calendar.js:297).
      if (!isSun) {
        var cf = fixedFeast(date); if (cf) {
          return out({ title: cf.title, season: "christmas", seasonLabel: "Christmastide",
            color: cf.color || "white", rank: cf.rank, dayKey: cf.key, orationsKey: cf.orationsKey, commonKey: cf.commonKey,
            seasonKey: "season-christmas", link: cf.link });
        }
        var cl = lesserFeast(date); if (cl) {
          return out({ title: cl.title, season: "christmas", seasonLabel: "Christmastide",
            color: cl.color || "white", rank: cl.rank, dayKey: cl.key, orationsKey: cl.orationsKey, commonKey: cl.commonKey,
            seasonKey: "season-christmas", link: cl.link });
        }
      }
      return out({ title: "Christmastide", season: "christmas", seasonLabel: "Christmastide",
        color: "white", sundayKey: "puer-natus", seasonKey: "season-christmas" });
    }

    // ---- Time after Epiphany (Jan 7 .. Septuagesima eve) ----
    if (date > A.epiphany && date < A.septuagesima) {
      if (sameDay(date, A.holyFamily)) {
        return out({ title: "The Holy Family (First Sunday after Epiphany)", season: "ordinary",
          seasonLabel: "Time after Epiphany", color: "white", rank: "Feast",
          dayKey: "holy-family", seasonKey: "season-ordinary" });
      }
      var es = sundayOnOrBefore(date);
      var en = 1 + weeksBetween(A.holyFamily, es); // Holy Family is the 1st after Epiphany
      var ekey = en <= 2 ? "epiph-2" : "epiph-3"; // 2nd = Omnis terra; 3rd–6th = Adorate Deum
      if (!isSun) {
        var eef = fixedFeast(date); if (eef) {
          return out({ title: eef.title, season: "ordinary", seasonLabel: "Time after Epiphany",
            color: eef.color || "white", rank: eef.rank, dayKey: eef.key, orationsKey: eef.orationsKey, commonKey: eef.commonKey,
            seasonKey: "season-ordinary", link: eef.link });
        }
        var eel = lesserFeast(date); if (eel) {
          return out({ title: eel.title, season: "ordinary", seasonLabel: "Time after Epiphany",
            color: eel.color || "white", rank: eel.rank, dayKey: eel.key, orationsKey: eel.orationsKey, commonKey: eel.commonKey,
            seasonKey: "season-ordinary", link: eel.link });
        }
      }
      return out({ title: ferial(en, "Sunday after Epiphany", date, isSun, true), season: "ordinary",
        seasonLabel: "Time after Epiphany", color: "green",
        dayKey: isSun ? ekey : null, sundayKey: ekey, seasonKey: "season-ordinary" });
    }

    // ---- Septuagesima (pre-Lent, violet, 3 Sundays) ----
    if (date >= A.septuagesima && date < A.ashWednesday) {
      var skey, sname;
      if (date < A.sexagesima) { skey = "septuagesima"; sname = "Septuagesima"; }
      else if (date < A.quinquagesima) { skey = "sexagesima"; sname = "Sexagesima"; }
      else { skey = "quinquagesima"; sname = "Quinquagesima"; }
      if (!isSun) {
        var ssf = fixedFeast(date); if (ssf) {
          return out({ title: ssf.title, season: "lent", seasonLabel: "Septuagesima",
            color: ssf.color || "white", rank: ssf.rank, dayKey: ssf.key, orationsKey: ssf.orationsKey, commonKey: ssf.commonKey,
            seasonKey: "season-lent", link: ssf.link });
        }
        var ssl = lesserFeast(date); if (ssl) {
          return out({ title: ssl.title, season: "lent", seasonLabel: "Septuagesima",
            color: ssl.color || "white", rank: ssl.rank, dayKey: ssl.key, orationsKey: ssl.orationsKey, commonKey: ssl.commonKey,
            seasonKey: "season-lent", link: ssl.link });
        }
      }
      return out({ title: isSun ? sname + " Sunday" : WEEKDAY[dow(date)] + " after " + sname,
        season: "lent", seasonLabel: "Septuagesima", color: "violet",
        dayKey: isSun ? skey : null, sundayKey: skey, seasonKey: "season-lent" });
    }

    // ---- Lent & Passiontide (Ash Wednesday .. Holy Saturday) ----
    if (date >= A.ashWednesday && date < A.easterSun) {
      if (sameDay(date, A.ashWednesday)) {
        return out({ title: "Ash Wednesday", season: "lent", seasonLabel: "Lent", color: "violet",
          rank: "Feria", dayKey: "misereris", seasonKey: "season-lent",
          link: "https://en.wikipedia.org/wiki/Ash_Wednesday" });
      }
      if (sameDay(date, addDays(A.easterSun, -3))) { // Holy Thursday
        // The evening Mass of the Lord's Supper opens the Sacred Triduum, so it is
        // no longer Lent proper (mirrors calendar.js's Holy Thursday handling).
        return out({ title: "Holy Thursday of the Lord's Supper", season: "easter",
          seasonLabel: "Passiontide", color: "white", rank: "Solemnity",
          dayKey: "nos-autem", seasonKey: "season-lent",
          link: "https://en.wikipedia.org/wiki/Maundy_Thursday" });
      }
      if (sameDay(date, addDays(A.easterSun, -2))) { // Good Friday
        // No Mass, and so no Introit, in either Missal — see ROADMAP.md. A
        // distinct season (and a seasonKey with no INTROITS entry) keeps
        // pickPart's walk-back and season-anchor fallback from borrowing Palm
        // Sunday's or Holy Thursday's chants (mirrors calendar.js).
        return out({ title: "Good Friday of the Lord's Passion", season: "triduum-aliturgical",
          seasonLabel: "Passiontide", color: "black", rank: "Solemnity",
          seasonKey: "season-triduum-aliturgical",
          link: "https://en.wikipedia.org/wiki/Good_Friday" });
      }
      if (sameDay(date, addDays(A.easterSun, -1))) { // Holy Saturday (daytime)
        // Aliturgical day of prayer at the Lord's tomb — no Mass until the
        // Easter Vigil after nightfall, which this app does not model as a
        // separate calendar day. Same no-borrow treatment as Good Friday.
        return out({ title: "Holy Saturday", season: "triduum-aliturgical",
          seasonLabel: "Passiontide", color: "violet", rank: "Feria",
          seasonKey: "season-triduum-aliturgical",
          link: "https://en.wikipedia.org/wiki/Holy_Saturday" });
      }
      if (date < A.lentOne) { // Thu–Sat after Ash Wednesday
        return out({ title: WEEKDAY[dow(date)] + " after Ash Wednesday", season: "lent",
          seasonLabel: "Lent", color: "violet", sundayKey: "misereris", seasonKey: "season-lent" });
      }
      // Fixed solemnities (Joseph Mar 19, Annunciation Mar 25) displace a Lenten
      // weekday, but a Sunday of Lent outranks them (mirrors calendar.js:318).
      if (!isSun) {
        var llfe = fixedFeast(date); if (llfe) {
          return out({ title: llfe.title, season: "lent", seasonLabel: "Lent",
            color: llfe.color || "white", rank: llfe.rank, dayKey: llfe.key, orationsKey: llfe.orationsKey, commonKey: llfe.commonKey,
            seasonKey: "season-lent", link: llfe.link });
        }
        var lllf = lesserFeast(date); if (lllf) {
          return out({ title: lllf.title, season: "lent", seasonLabel: "Lent",
            color: lllf.color || "white", rank: lllf.rank, dayKey: lllf.key, orationsKey: lllf.orationsKey, commonKey: lllf.commonKey,
            seasonKey: "season-lent", link: lllf.link });
        }
      }
      var ls = sundayOnOrBefore(date);
      var lw = 1 + weeksBetween(A.lentOne, ls); // Lent I = first Sunday of Lent
      var isPalm = sameDay(ls, A.palmSunday);
      var lkey, ltitle, lcolor = "violet", llabel = "Lent";
      if (isPalm) { lkey = "palm"; ltitle = "Palm Sunday"; llabel = "Passiontide"; }
      else if (lw === 5) { lkey = "passion"; ltitle = "Passion Sunday (First Sunday of the Passion)"; llabel = "Passiontide"; }
      else if (lw === 4) { lkey = "laetare"; ltitle = "Laetare Sunday (Fourth Sunday of Lent)"; lcolor = "rose"; }
      else { lkey = "lent-" + lw; ltitle = ordinal(lw) + " Sunday of Lent"; }
      if (!isSun) {
        ltitle = WEEKDAY[dow(date)] + " of the " + ordinal(lw) + " Week of Lent";
        if (lw >= 5) llabel = "Passiontide";
      }
      return out({ title: ltitle, season: "lent", seasonLabel: llabel, color: lcolor,
        dayKey: isSun ? lkey : null, sundayKey: lkey, seasonKey: "season-lent",
        link: isPalm ? "https://en.wikipedia.org/wiki/Palm_Sunday" : undefined });
    }

    // ---- Eastertide (Easter .. Pentecost) ----
    if (date >= A.easterSun && date <= A.pentecost) {
      if (sameDay(date, A.easterSun)) {
        return out({ title: "Easter Sunday of the Resurrection", season: "easter", seasonLabel: "Eastertide",
          color: "white", rank: "Solemnity", dayKey: "resurrexi", seasonKey: "season-easter",
          link: "https://en.wikipedia.org/wiki/Easter" });
      }
      if (sameDay(date, A.pentecost)) {
        return out({ title: "Pentecost Sunday", season: "easter", seasonLabel: "Eastertide",
          color: "red", rank: "Solemnity", dayKey: "spiritus-domini", seasonKey: "season-easter",
          link: "https://en.wikipedia.org/wiki/Pentecost" });
      }
      if (sameDay(date, A.ascension)) {
        return out({ title: "The Ascension of the Lord", season: "easter", seasonLabel: "Eastertide",
          color: "white", rank: "Solemnity", dayKey: "viri-galilaei", seasonKey: "season-easter",
          link: "https://en.wikipedia.org/wiki/Feast_of_the_Ascension" });
      }
      if (sameDay(date, A.sundayAfterAscension)) {
        return out({ title: "Sunday after the Ascension", season: "easter", seasonLabel: "Eastertide",
          color: "white", rank: "Sunday", dayKey: "sunday-after-ascension", seasonKey: "season-easter" });
      }
      // The Annunciation (Mar 25) can land in Eastertide on a weekday (mirrors
      // calendar.js:365-368).
      if (!isSun) {
        var eafe = fixedFeast(date); if (eafe) {
          return out({ title: eafe.title, season: "easter", seasonLabel: "Eastertide",
            color: eafe.color || "white", rank: eafe.rank, dayKey: eafe.key, orationsKey: eafe.orationsKey, commonKey: eafe.commonKey,
            seasonKey: "season-easter", link: eafe.link });
        }
        var ealf = lesserFeast(date); if (ealf) {
          return out({ title: ealf.title, season: "easter", seasonLabel: "Eastertide",
            color: ealf.color || "white", rank: ealf.rank, dayKey: ealf.key, orationsKey: ealf.orationsKey, commonKey: ealf.commonKey,
            seasonKey: "season-easter", link: ealf.link });
        }
      }
      // Eastertide Sundays/ferias by week index from Easter.
      var ew = weeksBetween(A.easterSun, sundayOnOrBefore(date));
      var EASTER_SUN = ["resurrexi", "quasimodo", "easter-misericordia", "easter-jubilate",
        "easter-cantate", "easter-vocem"];
      var EASTER_TITLE = ["Easter", "Low Sunday (Quasimodo)", "Second Sunday after Easter",
        "Third Sunday after Easter", "Fourth Sunday after Easter", "Fifth Sunday after Easter"];
      var ekey2 = EASTER_SUN[ew] || "resurrexi";
      var etitle = isSun ? (EASTER_TITLE[ew] || "Eastertide")
        : WEEKDAY[dow(date)] + (ew === 0 ? " in the Octave of Easter" : " after " + (EASTER_TITLE[ew] || "Easter"));
      return out({ title: etitle, season: "easter", seasonLabel: "Eastertide", color: "white",
        dayKey: isSun ? ekey2 : null, sundayKey: ekey2, seasonKey: "season-easter" });
    }

    // ---- Time after Pentecost (after Pentecost .. Advent I eve) ----
    if (sameDay(date, A.trinity)) {
      return out({ title: "Trinity Sunday", season: "ordinary", seasonLabel: "Time after Pentecost",
        color: "white", rank: "Solemnity", dayKey: "trinity", seasonKey: "season-ordinary",
        link: "https://en.wikipedia.org/wiki/Trinity_Sunday" });
    }
    if (sameDay(date, A.corpusChristi)) {
      return out({ title: "Corpus Christi", season: "ordinary", seasonLabel: "Time after Pentecost",
        color: "white", rank: "Feast", dayKey: "cibavit", seasonKey: "season-ordinary",
        link: "https://en.wikipedia.org/wiki/Feast_of_Corpus_Christi" });
    }
    if (sameDay(date, A.sacredHeart)) {
      return out({ title: "The Most Sacred Heart of Jesus", season: "ordinary",
        seasonLabel: "Time after Pentecost", color: "white", rank: "Feast",
        dayKey: "sacred-heart", seasonKey: "season-ordinary",
        link: "https://en.wikipedia.org/wiki/Feast_of_the_Sacred_Heart" });
    }
    if (sameDay(date, A.christKing)) {
      return out({ title: "The Kingship of Our Lord Jesus Christ (Christ the King)", season: "ordinary",
        seasonLabel: "Time after Pentecost", color: "white", rank: "Solemnity",
        dayKey: "christ-king", seasonKey: "season-ordinary",
        link: "https://en.wikipedia.org/wiki/Feast_of_Christ_the_King" });
    }
    // The Assumption, All Saints, and All Souls outrank the green Sunday after
    // Pentecost they fall on, as well as every weekday (mirrors calendar.js's
    // Ordinary-Time sanctoral-precedence rule).
    var pfe = fixedFeast(date);
    if (pfe) {
      return out({ title: pfe.title, season: "ordinary", seasonLabel: "Time after Pentecost",
        color: pfe.color || "white", rank: pfe.rank, dayKey: pfe.key, orationsKey: pfe.orationsKey, commonKey: pfe.commonKey,
        seasonKey: "season-ordinary", link: pfe.link });
    }
    // Unlike the fixed feasts above, a lesser feast never outranks a Sunday
    // after Pentecost — gate this one on `!isSun` (mirrors calendar.js:403-405).
    if (!isSun) {
      var pl = lesserFeast(date);
      if (pl) {
        return out({ title: pl.title, season: "ordinary", seasonLabel: "Time after Pentecost",
          color: pl.color || "white", rank: pl.rank, dayKey: pl.key, orationsKey: pl.orationsKey, commonKey: pl.commonKey,
          seasonKey: "season-ordinary", link: pl.link });
      }
    }

    // Numbered Sundays after Pentecost (and resumed Sundays after Epiphany).
    var gs = sundayOnOrBefore(date);
    var w = weeksBetween(A.pentecost, gs);   // Pentecost = 0, Trinity = 1, …
    var key, title, label = "Time after Pentecost";
    if (sameDay(gs, A.lastAfterPentecost)) {
      key = "pent-23"; // the Last Sunday repeats the 23rd Sunday's introit (Dicit Dominus)
      title = "Last Sunday after Pentecost";
    } else if (w <= 23) {
      key = "pent-" + w;
      title = ordinal(w) + " Sunday after Pentecost";
    } else {
      // Resumed Sundays after Epiphany fill weeks 24 .. (last − 1); the one nearest
      // the Last Sunday takes the Sixth Sunday after Epiphany, counting down. Those
      // Sundays (3rd–6th) all share the "Adorate Deum" introit; the 2nd is "Omnis terra".
      var lastW = weeksBetween(A.pentecost, A.lastAfterPentecost);
      var ei = 6 - (lastW - 1 - w);
      if (ei < 2) ei = 2;
      key = ei <= 2 ? "epiph-2" : "epiph-3";
      title = "Resumed " + ordinal(ei) + " Sunday after Epiphany";
    }
    if (!isSun) {
      title = WEEKDAY[dow(date)] + " after the " + (w === 1 ? "First Sunday" : ordinal(w) + " Sunday") + " after Pentecost";
    }
    return out({ title: title, season: "ordinary", seasonLabel: label, color: "green",
      dayKey: isSun ? key : null, sundayKey: key, seasonKey: "season-ordinary" });

    // ---- helpers ----
    function ferial(weekNo, seasonWord, d, isSunday, sundayWord) {
      if (isSunday) {
        return sundayWord ? ordinal(weekNo) + " " + seasonWord
          : ordinal(weekNo) + " Sunday " + seasonWord;
      }
      return WEEKDAY[dow(d)] + " of the " + ordinal(weekNo) + " Week " +
        (sundayWord ? "after Epiphany" : seasonWord);
    }
  }

  window.RESOLVE_DAY_1962 = resolve;
})();
