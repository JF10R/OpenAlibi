export const SUPPORTED_LOCALES = Object.freeze(['en', 'fr', 'es']);
export const DEFAULT_LOCALE = 'en';

const MESSAGES = {
  en: {
    difficulty: {
      facile: 'Easy',
      moyen: 'Medium',
      difficile: 'Hard',
      expert: 'Expert',
    },
    pronoun: {
      f: 'She',
      m: 'He',
    },
    clues: {
      victimWithKiller: 'The victim was alone with the murderer.',
      room: '{pronoun} was in {room}.',
      row: '{pronoun} was in row {row}.',
      col: '{pronoun} was in column {col}.',
      rowHalfTop: '{pronoun} was in the upper half of the map.',
      rowHalfBottom: '{pronoun} was in the lower half of the map.',
      colHalfLeft: '{pronoun} was in the left half of the map.',
      colHalfRight: '{pronoun} was in the right half of the map.',
      onObject: '{pronoun} was on {object}.',
      besideObject: '{pronoun} was next to {object}.',
      notBesideObject: '{pronoun} was not next to any “{object}” object.',
      aloneInRoomF: 'She was alone in her room.',
      aloneInRoomM: 'He was alone in his room.',
      sameRoom: '{pronoun} was in the same room as {other}.',
      notSameRoom: '{pronoun} was not in the same room as {other}.',
      northOf: '{pronoun} was north of {other}.',
      southOf: '{pronoun} was south of {other}.',
      westOf: '{pronoun} was west of {other}.',
      eastOf: '{pronoun} was east of {other}.',
      besidePerson: '{pronoun} was directly next to {other}, in the same room.',
    },
    hints: {
      room: '{pronoun} is in {room}.',
      row: '{pronoun} is in row {row}.',
      col: '{pronoun} is in column {col}.',
    },
    ui: {
      documentTitle: 'OpenAlibi — Mystery Logic Grids',
      brandEyebrow: 'Mystery logic grids · Grilles d’enquête · Cuadrículas de misterio',
      language: 'Language',
      themeDark: 'Dark mode',
      themeLight: 'Light mode',
      enableDark: 'Enable dark mode',
      enableLight: 'Enable light mode',
      rules: 'Rules',
      settings: 'Settings',
      newCase: 'New case',
      rows: 'Rows',
      columns: 'Columns',
      difficulty: 'Difficulty',
      density: 'Character density',
      densityHelp: 'Maximum: the smaller number of rows or columns.',
      seedLabel: 'Reproducible seed',
      generate: 'Generate a unique case',
      legendTitle: 'Map legend',
      legendOccupiable: 'Occupiable cell',
      legendBlocked: 'Blocking object',
      legendObjects: 'Chair · bed · rug · puddle — occupiable objects',
      legendRightClick: 'Right-click: add or remove an ×.',
      activeCase: 'Active case',
      generating: 'Generating…',
      victim: 'Victim',
      crimeScene: 'Crime scene',
      boardIntro: 'At most one person per row and column.',
      boardVictimRule: 'The victim shares a room with exactly one other person.',
      print: 'Print',
      boardAria: 'Mystery logic grid',
      testimonies: 'Testimonies',
      characters: 'Characters',
      check: 'Check answers',
      getHint: 'Get a hint',
      clear: 'Clear',
      reveal: 'Reveal',
      exportJson: 'Export JSON',
      initializing: 'Initializing…',
      howToPlay: 'How to play',
      rulesTitle: 'OpenAlibi rules',
      close: 'Close',
      rule1Title: 'Place every character.',
      rule1Body: 'The victim has a name beginning with V and must always be placed last. Every testimony is true.',
      rule2Title: 'Respect rows and columns.',
      rule2Body: 'Two people can never share a row or column.',
      rule3Title: 'Respect the map.',
      rule3Body: 'Blocking furniture cannot be occupied. Chairs, beds, rugs and puddles can.',
      rule4Title: '“Next to” is orthogonal.',
      rule4Body: 'The cell must be directly above, below, left or right, and in the same room.',
      rule5Title: 'The murderer is inferred automatically.',
      rule5Body: 'When answers are checked, the person alone with the victim is identified as the murderer.',
      rectangleRule: 'Rectangular grids use at most min(rows, columns) characters to preserve the row-column constraint.',
      caseClosed: 'Case closed',
      exactDeduction: 'Correct deduction',
      continue: 'Continue',
      suspectVictim: 'Victim',
      inferredKiller: 'Inferred murderer',
      placed: 'Placed: {cell}',
      unplaced: 'To place',
      caseMeta: '{rows} × {cols} · {count} characters · {difficulty} · seed {seed}',
      cellFormat: 'R{row} C{col}',
      cellAria: 'Row {row}, column {col}{object}',
      cellObjectAria: ', {object}, {occupancy}',
      occupiable: 'occupiable',
      notOccupiable: 'not occupiable',
      removeConfirmation: 'Remove?',
      victimMark: 'Victim',
      successText: '{killer} was alone with the victim in the same room. Every position is correct.',
      confirmReveal: 'Reveal every position and the murderer?',
    },
    status: {
      generating: 'Generating and verifying uniqueness…',
      generated: 'Unique case generated. Select a character, then a cell.',
      generationFailed: 'Generation failed.',
      placeOthersFirst: 'Place every other character first.',
      selectCharacter: 'Select a character first.',
      victimLast: 'The victim must be placed last.',
      blockedCell: 'This cell cannot be occupied.',
      confirmRemoval: 'Click {cell} again to remove {name}.',
      characterRemoved: 'Character removed from the grid.',
      rowColumnConflict: 'Conflict: {name} already blocks this row or column.',
      characterPlaced: '{name} placed at {cell}.',
      solved: 'Case solved.',
      incomplete: '{correct}/{total} correct placements. More characters remain.',
      victimAlone: 'Impossible placement: the victim cannot be alone in the room.',
      victimCrowded: 'Impossible placement: the victim must share a room with exactly one person.',
      wrongPositions: '{correct}/{total} correct placements. Errors are marked in red.',
      killerUnknown: 'The positions are correct, but the murderer cannot be inferred.',
      cleared: 'Grid cleared.',
      noHint: 'No new non-redundant hint is available.',
      hint: 'Hint: {name}. {description}',
      revealed: 'Solution revealed: {name} is the murderer.',
    },
    errors: {
      generationFailed: 'The generator could not produce a unique case. Slightly change the size or density.',
    },
  },
  fr: {
    difficulty: {
      facile: 'Facile',
      moyen: 'Moyen',
      difficile: 'Difficile',
      expert: 'Expert',
    },
    pronoun: {
      f: 'Elle',
      m: 'Il',
    },
    clues: {
      victimWithKiller: 'La victime était seule avec le meurtrier.',
      room: '{pronoun} se trouvait dans {room}.',
      row: '{pronoun} était dans la rangée {row}.',
      col: '{pronoun} était dans la colonne {col}.',
      rowHalfTop: '{pronoun} était dans la moitié supérieure du plan.',
      rowHalfBottom: '{pronoun} était dans la moitié inférieure du plan.',
      colHalfLeft: '{pronoun} était dans la moitié gauche du plan.',
      colHalfRight: '{pronoun} était dans la moitié droite du plan.',
      onObject: '{pronoun} était sur {object}.',
      besideObject: '{pronoun} était à côté {object}.',
      notBesideObject: '{pronoun} n’était à côté d’aucun objet de type « {object} ».',
      aloneInRoomF: 'Elle était seule dans sa pièce.',
      aloneInRoomM: 'Il était seul dans sa pièce.',
      sameRoom: '{pronoun} se trouvait dans la même pièce que {other}.',
      notSameRoom: '{pronoun} ne se trouvait pas dans la même pièce que {other}.',
      northOf: '{pronoun} était au nord de {other}.',
      southOf: '{pronoun} était au sud de {other}.',
      westOf: '{pronoun} était à l’ouest de {other}.',
      eastOf: '{pronoun} était à l’est de {other}.',
      besidePerson: '{pronoun} était juste à côté de {other}, dans la même pièce.',
    },
    hints: {
      room: '{pronoun} se trouve dans {room}.',
      row: '{pronoun} se trouve dans la rangée {row}.',
      col: '{pronoun} se trouve dans la colonne {col}.',
    },
    ui: {
      documentTitle: 'OpenAlibi — Grilles d’enquête logique',
      brandEyebrow: 'Mystery logic grids · Grilles d’enquête · Cuadrículas de misterio',
      language: 'Langue',
      themeDark: 'Mode sombre',
      themeLight: 'Mode clair',
      enableDark: 'Activer le mode sombre',
      enableLight: 'Activer le mode clair',
      rules: 'Règles',
      settings: 'Paramètres',
      newCase: 'Nouveau cas',
      rows: 'Rangées',
      columns: 'Colonnes',
      difficulty: 'Difficulté',
      density: 'Densité de personnages',
      densityHelp: 'Maximum : le plus petit nombre entre les rangées et les colonnes.',
      seedLabel: 'Seed reproductible',
      generate: 'Générer un cas unique',
      legendTitle: 'Légende du plan',
      legendOccupiable: 'Case occupable',
      legendBlocked: 'Objet bloquant',
      legendObjects: 'Chaise · lit · tapis · flaque — objets occupables',
      legendRightClick: 'Clic droit : marquer ou retirer un ×.',
      activeCase: 'Dossier actif',
      generating: 'Génération…',
      victim: 'Victime',
      crimeScene: 'Scène du crime',
      boardIntro: 'Une personne au maximum par rangée et par colonne.',
      boardVictimRule: 'La victime partage sa pièce avec exactement une autre personne.',
      print: 'Imprimer',
      boardAria: 'Grille d’enquête logique',
      testimonies: 'Témoignages',
      characters: 'Personnages',
      check: 'Vérifier les réponses',
      getHint: 'Obtenir un indice',
      clear: 'Effacer',
      reveal: 'Révéler',
      exportJson: 'Exporter JSON',
      initializing: 'Initialisation…',
      howToPlay: 'Comment jouer',
      rulesTitle: 'Règles d’OpenAlibi',
      close: 'Fermer',
      rule1Title: 'Place tous les personnages.',
      rule1Body: 'La victime porte un nom commençant par V et se place toujours en dernier. Chaque témoignage est vrai.',
      rule2Title: 'Respecte les rangées et colonnes.',
      rule2Body: 'Deux personnes ne peuvent jamais partager une rangée ou une colonne.',
      rule3Title: 'Respecte le plan.',
      rule3Body: 'Les meubles bloquants ne peuvent pas être occupés. Les chaises, lits, tapis et flaques peuvent l’être.',
      rule4Title: '« À côté » est orthogonal.',
      rule4Body: 'La case doit être directement au-dessus, en dessous, à gauche ou à droite, et dans la même pièce.',
      rule5Title: 'Le meurtrier est déduit automatiquement.',
      rule5Body: 'Lors de la vérification, la personne seule avec la victime est identifiée comme meurtrière.',
      rectangleRule: 'Les grilles rectangulaires utilisent au maximum min(rangées, colonnes) personnages afin de préserver la contrainte ligne-colonne.',
      caseClosed: 'Affaire classée',
      exactDeduction: 'Déduction exacte',
      continue: 'Continuer',
      suspectVictim: 'Victime',
      inferredKiller: 'Meurtrier déduit',
      placed: 'Position : {cell}',
      unplaced: 'À placer',
      caseMeta: '{rows} × {cols} · {count} personnages · {difficulty} · seed {seed}',
      cellFormat: 'R{row} C{col}',
      cellAria: 'Rangée {row}, colonne {col}{object}',
      cellObjectAria: ', {object}, {occupancy}',
      occupiable: 'occupable',
      notOccupiable: 'non occupable',
      removeConfirmation: 'Retirer ?',
      victimMark: 'Victime',
      successText: '{killer} était seul avec la victime dans la même pièce. Toutes les positions sont exactes.',
      confirmReveal: 'Révéler toutes les positions et le meurtrier?',
    },
    status: {
      generating: 'Génération et vérification de l’unicité…',
      generated: 'Cas unique généré. Sélectionne un personnage, puis une case.',
      generationFailed: 'La génération a échoué.',
      placeOthersFirst: 'Place d’abord tous les autres personnages.',
      selectCharacter: 'Sélectionne d’abord un personnage.',
      victimLast: 'La victime doit être placée en dernier.',
      blockedCell: 'Cette case ne peut pas être occupée.',
      confirmRemoval: 'Clique encore sur {cell} pour retirer {name}.',
      characterRemoved: 'Personnage retiré de la grille.',
      rowColumnConflict: 'Conflit : {name} bloque déjà cette rangée ou cette colonne.',
      characterPlaced: '{name} placé en {cell}.',
      solved: 'Affaire résolue.',
      incomplete: '{correct}/{total} placements exacts. Il reste des personnages à placer.',
      victimAlone: 'Placement impossible : la victime ne peut pas être seule dans sa pièce.',
      victimCrowded: 'Placement impossible : la victime doit partager sa pièce avec exactement une personne.',
      wrongPositions: '{correct}/{total} placements exacts. Les erreurs sont marquées en rouge.',
      killerUnknown: 'Les positions sont exactes, mais le meurtrier ne peut pas être déduit.',
      cleared: 'Grille effacée.',
      noHint: 'Aucun nouvel indice non redondant n’est disponible.',
      hint: 'Indice : {name}. {description}',
      revealed: 'Solution révélée : {name} est le meurtrier.',
    },
    errors: {
      generationFailed: 'Le générateur n’a pas réussi à produire un cas unique. Modifiez légèrement la taille ou la densité.',
    },
  },
  es: {
    difficulty: {
      facile: 'Fácil',
      moyen: 'Medio',
      difficile: 'Difícil',
      expert: 'Experto',
    },
    pronoun: {
      f: 'Ella',
      m: 'Él',
    },
    clues: {
      victimWithKiller: 'La víctima estaba a solas con el asesino.',
      room: '{pronoun} estaba en {room}.',
      row: '{pronoun} estaba en la fila {row}.',
      col: '{pronoun} estaba en la columna {col}.',
      rowHalfTop: '{pronoun} estaba en la mitad superior del plano.',
      rowHalfBottom: '{pronoun} estaba en la mitad inferior del plano.',
      colHalfLeft: '{pronoun} estaba en la mitad izquierda del plano.',
      colHalfRight: '{pronoun} estaba en la mitad derecha del plano.',
      onObject: '{pronoun} estaba sobre {object}.',
      besideObject: '{pronoun} estaba al lado de {object}.',
      notBesideObject: '{pronoun} no estaba al lado de ningún objeto de tipo «{object}».',
      aloneInRoomF: 'Ella estaba sola en su habitación.',
      aloneInRoomM: 'Él estaba solo en su habitación.',
      sameRoom: '{pronoun} estaba en la misma habitación que {other}.',
      notSameRoom: '{pronoun} no estaba en la misma habitación que {other}.',
      northOf: '{pronoun} estaba al norte de {other}.',
      southOf: '{pronoun} estaba al sur de {other}.',
      westOf: '{pronoun} estaba al oeste de {other}.',
      eastOf: '{pronoun} estaba al este de {other}.',
      besidePerson: '{pronoun} estaba justo al lado de {other}, en la misma habitación.',
    },
    hints: {
      room: '{pronoun} está en {room}.',
      row: '{pronoun} está en la fila {row}.',
      col: '{pronoun} está en la columna {col}.',
    },
    ui: {
      documentTitle: 'OpenAlibi — Cuadrículas lógicas de misterio',
      brandEyebrow: 'Mystery logic grids · Grilles d’enquête · Cuadrículas de misterio',
      language: 'Idioma',
      themeDark: 'Modo oscuro',
      themeLight: 'Modo claro',
      enableDark: 'Activar el modo oscuro',
      enableLight: 'Activar el modo claro',
      rules: 'Reglas',
      settings: 'Ajustes',
      newCase: 'Nuevo caso',
      rows: 'Filas',
      columns: 'Columnas',
      difficulty: 'Dificultad',
      density: 'Densidad de personajes',
      densityHelp: 'Máximo: el menor número entre filas y columnas.',
      seedLabel: 'Seed reproducible',
      generate: 'Generar un caso único',
      legendTitle: 'Leyenda del plano',
      legendOccupiable: 'Casilla ocupable',
      legendBlocked: 'Objeto bloqueante',
      legendObjects: 'Silla · cama · alfombra · charco — objetos ocupables',
      legendRightClick: 'Clic derecho: añadir o quitar una ×.',
      activeCase: 'Caso activo',
      generating: 'Generando…',
      victim: 'Víctima',
      crimeScene: 'Escena del crimen',
      boardIntro: 'Como máximo una persona por fila y columna.',
      boardVictimRule: 'La víctima comparte habitación con exactamente otra persona.',
      print: 'Imprimir',
      boardAria: 'Cuadrícula lógica de misterio',
      testimonies: 'Testimonios',
      characters: 'Personajes',
      check: 'Comprobar respuestas',
      getHint: 'Obtener una pista',
      clear: 'Borrar',
      reveal: 'Revelar',
      exportJson: 'Exportar JSON',
      initializing: 'Inicializando…',
      howToPlay: 'Cómo jugar',
      rulesTitle: 'Reglas de OpenAlibi',
      close: 'Cerrar',
      rule1Title: 'Coloca a todos los personajes.',
      rule1Body: 'La víctima tiene un nombre que empieza por V y siempre se coloca al final. Cada testimonio es verdadero.',
      rule2Title: 'Respeta las filas y columnas.',
      rule2Body: 'Dos personas nunca pueden compartir una fila o columna.',
      rule3Title: 'Respeta el plano.',
      rule3Body: 'Los muebles bloqueantes no se pueden ocupar. Las sillas, camas, alfombras y charcos sí.',
      rule4Title: '«Al lado» es ortogonal.',
      rule4Body: 'La casilla debe estar directamente arriba, abajo, a la izquierda o a la derecha, y en la misma habitación.',
      rule5Title: 'El asesino se deduce automáticamente.',
      rule5Body: 'Al comprobar las respuestas, la persona a solas con la víctima se identifica como el asesino.',
      rectangleRule: 'Las cuadrículas rectangulares usan como máximo min(filas, columnas) personajes para conservar la restricción fila-columna.',
      caseClosed: 'Caso cerrado',
      exactDeduction: 'Deducción correcta',
      continue: 'Continuar',
      suspectVictim: 'Víctima',
      inferredKiller: 'Asesino deducido',
      placed: 'Posición: {cell}',
      unplaced: 'Por colocar',
      caseMeta: '{rows} × {cols} · {count} personajes · {difficulty} · seed {seed}',
      cellFormat: 'F{row} C{col}',
      cellAria: 'Fila {row}, columna {col}{object}',
      cellObjectAria: ', {object}, {occupancy}',
      occupiable: 'ocupable',
      notOccupiable: 'no ocupable',
      removeConfirmation: '¿Quitar?',
      victimMark: 'Víctima',
      successText: '{killer} estaba a solas con la víctima en la misma habitación. Todas las posiciones son correctas.',
      confirmReveal: '¿Revelar todas las posiciones y al asesino?',
    },
    status: {
      generating: 'Generando y verificando la unicidad…',
      generated: 'Caso único generado. Selecciona un personaje y luego una casilla.',
      generationFailed: 'La generación ha fallado.',
      placeOthersFirst: 'Coloca primero a todos los demás personajes.',
      selectCharacter: 'Selecciona primero un personaje.',
      victimLast: 'La víctima debe colocarse al final.',
      blockedCell: 'Esta casilla no se puede ocupar.',
      confirmRemoval: 'Haz clic de nuevo en {cell} para quitar a {name}.',
      characterRemoved: 'Personaje retirado de la cuadrícula.',
      rowColumnConflict: 'Conflicto: {name} ya bloquea esta fila o columna.',
      characterPlaced: '{name} colocado en {cell}.',
      solved: 'Caso resuelto.',
      incomplete: '{correct}/{total} posiciones correctas. Quedan personajes por colocar.',
      victimAlone: 'Posición imposible: la víctima no puede estar sola en la habitación.',
      victimCrowded: 'Posición imposible: la víctima debe compartir habitación con exactamente una persona.',
      wrongPositions: '{correct}/{total} posiciones correctas. Los errores están marcados en rojo.',
      killerUnknown: 'Las posiciones son correctas, pero no se puede deducir al asesino.',
      cleared: 'Cuadrícula borrada.',
      noHint: 'No hay ninguna pista nueva que no sea redundante.',
      hint: 'Pista: {name}. {description}',
      revealed: 'Solución revelada: {name} es el asesino.',
    },
    errors: {
      generationFailed: 'El generador no pudo producir un caso único. Cambia ligeramente el tamaño o la densidad.',
    },
  },
};

const ROOM_NAMES = {
  en: {
    livingRoom: 'Living Room',
    diningRoom: 'Dining Room',
    library: 'Library',
    gallery: 'Gallery',
    workshop: 'Workshop',
    meetingRoom: 'Meeting Room',
    indoorGarden: 'Indoor Garden',
    kitchen: 'Kitchen',
    office: 'Office',
    bedroom: 'Bedroom',
    sunroom: 'Sunroom',
    archives: 'Archives',
    laboratory: 'Laboratory',
    musicRoom: 'Music Room',
    studio: 'Studio',
    cafe: 'Café',
    bathroom: 'Bathroom',
    laundryRoom: 'Laundry Room',
    storageRoom: 'Storage Room',
    vestibule: 'Vestibule',
    dressingRoom: 'Dressing Room',
    warehouse: 'Warehouse',
    hall: 'Hall',
  },
  fr: {
    livingRoom: 'Salon',
    diningRoom: 'Salle à manger',
    library: 'Bibliothèque',
    gallery: 'Galerie',
    workshop: 'Atelier',
    meetingRoom: 'Salle de réunion',
    indoorGarden: 'Jardin intérieur',
    kitchen: 'Cuisine',
    office: 'Bureau',
    bedroom: 'Chambre',
    sunroom: 'Véranda',
    archives: 'Archives',
    laboratory: 'Laboratoire',
    musicRoom: 'Salle de musique',
    studio: 'Studio',
    cafe: 'Café',
    bathroom: 'Salle de bain',
    laundryRoom: 'Buanderie',
    storageRoom: 'Réserve',
    vestibule: 'Vestibule',
    dressingRoom: 'Loge',
    warehouse: 'Entrepôt',
    hall: 'Hall',
  },
  es: {
    livingRoom: 'Salón',
    diningRoom: 'Comedor',
    library: 'Biblioteca',
    gallery: 'Galería',
    workshop: 'Taller',
    meetingRoom: 'Sala de reuniones',
    indoorGarden: 'Jardín interior',
    kitchen: 'Cocina',
    office: 'Despacho',
    bedroom: 'Dormitorio',
    sunroom: 'Porche acristalado',
    archives: 'Archivo',
    laboratory: 'Laboratorio',
    musicRoom: 'Sala de música',
    studio: 'Estudio',
    cafe: 'Cafetería',
    bathroom: 'Baño',
    laundryRoom: 'Lavandería',
    storageRoom: 'Trastero',
    vestibule: 'Vestíbulo',
    dressingRoom: 'Camerino',
    warehouse: 'Almacén',
    hall: 'Recibidor',
  },
};

const OBJECT_COPY = {
  en: {
    chair: { label: 'chair', indefinite: 'a chair', afterOf: 'a chair' },
    bed: { label: 'bed', indefinite: 'a bed', afterOf: 'a bed' },
    carpet: { label: 'rug', indefinite: 'a rug', afterOf: 'a rug' },
    puddle: { label: 'puddle', indefinite: 'a puddle', afterOf: 'a puddle' },
    table: { label: 'table', indefinite: 'a table', afterOf: 'a table' },
    shelf: { label: 'shelf', indefinite: 'a shelf', afterOf: 'a shelf' },
    plant: { label: 'plant', indefinite: 'a plant', afterOf: 'a plant' },
    counter: { label: 'counter', indefinite: 'a counter', afterOf: 'a counter' },
    statue: { label: 'statue', indefinite: 'a statue', afterOf: 'a statue' },
    tv: { label: 'television', indefinite: 'a television', afterOf: 'a television' },
  },
  fr: {
    chair: { label: 'chaise', indefinite: 'une chaise', afterOf: 'd’une chaise' },
    bed: { label: 'lit', indefinite: 'un lit', afterOf: 'd’un lit' },
    carpet: { label: 'tapis', indefinite: 'un tapis', afterOf: 'd’un tapis' },
    puddle: { label: 'flaque', indefinite: 'une flaque', afterOf: 'd’une flaque' },
    table: { label: 'table', indefinite: 'une table', afterOf: 'd’une table' },
    shelf: { label: 'étagère', indefinite: 'une étagère', afterOf: 'd’une étagère' },
    plant: { label: 'plante', indefinite: 'une plante', afterOf: 'd’une plante' },
    counter: { label: 'comptoir', indefinite: 'un comptoir', afterOf: 'd’un comptoir' },
    statue: { label: 'statue', indefinite: 'une statue', afterOf: 'd’une statue' },
    tv: { label: 'télévision', indefinite: 'une télévision', afterOf: 'd’une télévision' },
  },
  es: {
    chair: { label: 'silla', indefinite: 'una silla', afterOf: 'una silla' },
    bed: { label: 'cama', indefinite: 'una cama', afterOf: 'una cama' },
    carpet: { label: 'alfombra', indefinite: 'una alfombra', afterOf: 'una alfombra' },
    puddle: { label: 'charco', indefinite: 'un charco', afterOf: 'un charco' },
    table: { label: 'mesa', indefinite: 'una mesa', afterOf: 'una mesa' },
    shelf: { label: 'estantería', indefinite: 'una estantería', afterOf: 'una estantería' },
    plant: { label: 'planta', indefinite: 'una planta', afterOf: 'una planta' },
    counter: { label: 'mostrador', indefinite: 'un mostrador', afterOf: 'un mostrador' },
    statue: { label: 'estatua', indefinite: 'una estatua', afterOf: 'una estatua' },
    tv: { label: 'televisor', indefinite: 'un televisor', afterOf: 'un televisor' },
  },
};

const CASE_TITLES = {
  en: [
    'The Silent Banquet', 'The Impossible Alibi', 'The Broken Portrait',
    'The Midnight Corridor', 'The Secret Meeting', 'The Crimson Inheritance',
    'The Last Manuscript', 'The Interrupted Concert', 'The Locked Dressing Room',
    'The Garden of the Missing', 'The Room Without a Witness', 'The Café of Lies',
  ],
  fr: [
    'Le Banquet silencieux', 'L’Alibi impossible', 'Le Portrait brisé',
    'Le Couloir nocturne', 'Le Rendez-vous secret', 'L’Héritage pourpre',
    'Le Dernier manuscrit', 'Le Concert interrompu', 'La Loge verrouillée',
    'Le Jardin des absents', 'La Chambre sans témoin', 'Le Café des mensonges',
  ],
  es: [
    'El banquete silencioso', 'La coartada imposible', 'El retrato roto',
    'El pasillo nocturno', 'La cita secreta', 'La herencia carmesí',
    'El último manuscrito', 'El concierto interrumpido', 'El camerino cerrado',
    'El jardín de los ausentes', 'La habitación sin testigos', 'El café de las mentiras',
  ],
};

const NAME_CATALOGS = {
  en: {
    female: [
      'Alice', 'Amelia', 'Abigail', 'Audrey', 'Beatrice', 'Brooke', 'Charlotte', 'Chloe',
      'Clara', 'Daisy', 'Eleanor', 'Elizabeth', 'Ella', 'Emily', 'Emma', 'Evelyn',
      'Florence', 'Grace', 'Hannah', 'Harper', 'Hazel', 'Iris', 'Isabella', 'Jade',
      'Jasmine', 'Julia', 'Lily', 'Lucy', 'Madison', 'Maya', 'Mia', 'Naomi',
      'Nora', 'Olivia', 'Penelope', 'Ruby', 'Sarah', 'Scarlett', 'Sophia', 'Stella', 'Zoe',
    ],
    male: [
      'Aaron', 'Adam', 'Adrian', 'Alex', 'Andrew', 'Anthony', 'Arthur', 'Benjamin',
      'Caleb', 'Cameron', 'Charles', 'Daniel', 'David', 'Dominic', 'Edward', 'Elias',
      'Ethan', 'Felix', 'Gabriel', 'George', 'Harry', 'Henry', 'Hugo', 'Isaac',
      'Jack', 'Jacob', 'James', 'Jason', 'Jordan', 'Joseph', 'Julian', 'Leo',
      'Liam', 'Lucas', 'Marcus', 'Mason', 'Matthew', 'Nathan', 'Nicholas', 'Noah',
      'Oliver', 'Oscar', 'Paul', 'Samuel', 'Thomas', 'William', 'Zachary',
    ],
    victimFemale: ['Valerie'],
    victimMale: ['Victor'],
  },
  fr: {
    female: [
      'Alice', 'Amélie', 'Anaïs', 'Audrey', 'Béatrice', 'Camille', 'Chloé', 'Clara',
      'Daphné', 'Élodie', 'Emma', 'Estelle', 'Flora', 'Gaëlle', 'Hélène', 'Inès',
      'Iris', 'Jade', 'Jasmine', 'Juliette', 'Léa', 'Lina', 'Louise', 'Maëlle',
      'Manon', 'Margaux', 'Maya', 'Mélanie', 'Naïma', 'Naomi', 'Noémie', 'Océane',
      'Pénélope', 'Roxane', 'Salomé', 'Sarah', 'Sofia', 'Solène', 'Thaïs', 'Yasmine', 'Zoé',
    ],
    male: [
      'Adrien', 'Alex', 'Antoine', 'Armand', 'Arthur', 'Bastien', 'Benjamin', 'Cédric',
      'Clément', 'Damien', 'Élias', 'Enzo', 'Étienne', 'Fabien', 'Félix', 'Gabriel',
      'Guillaume', 'Hector', 'Hugo', 'Ismaël', 'Jordan', 'Julien', 'Karim', 'Laurent',
      'Léo', 'Loïc', 'Malik', 'Marc', 'Mathis', 'Maxime', 'Nathan', 'Nicolas', 'Noé',
      'Olivier', 'Oscar', 'Paul', 'Quentin', 'Raphaël', 'Rémi', 'Romain', 'Sacha',
      'Samir', 'Théo', 'Thomas', 'Ulysse', 'Xavier', 'Zacharie',
    ],
    victimFemale: ['Valérie'],
    victimMale: ['Victor'],
  },
  es: {
    female: [
      'Adriana', 'Alba', 'Alejandra', 'Alicia', 'Ana', 'Andrea', 'Beatriz', 'Camila',
      'Carmen', 'Carolina', 'Catalina', 'Clara', 'Daniela', 'Elena', 'Elisa', 'Emilia',
      'Emma', 'Eva', 'Gabriela', 'Inés', 'Irene', 'Isabel', 'Jimena', 'Julia',
      'Laura', 'Lucía', 'Manuela', 'María', 'Marina', 'Marta', 'Natalia', 'Noelia',
      'Nora', 'Olivia', 'Paula', 'Pilar', 'Raquel', 'Sara', 'Sofía', 'Teresa', 'Yasmina',
    ],
    male: [
      'Adrián', 'Alejandro', 'Álvaro', 'Andrés', 'Antonio', 'Bruno', 'Carlos', 'César',
      'Daniel', 'David', 'Diego', 'Eduardo', 'Emilio', 'Enrique', 'Esteban', 'Felipe',
      'Fernando', 'Francisco', 'Gabriel', 'Gonzalo', 'Guillermo', 'Héctor', 'Hugo', 'Ignacio',
      'Iván', 'Javier', 'Joaquín', 'Jorge', 'José', 'Juan', 'Julián', 'Leo',
      'Lucas', 'Manuel', 'Marcos', 'Mario', 'Martín', 'Mateo', 'Miguel', 'Nicolás',
      'Óscar', 'Pablo', 'Rafael', 'Raúl', 'Ricardo', 'Sergio', 'Tomás',
    ],
    victimFemale: ['Valeria'],
    victimMale: ['Víctor'],
  },
};

export function normalizeLocale(locale) {
  const language = String(locale ?? '').trim().toLowerCase().split(/[-_]/)[0];
  return SUPPORTED_LOCALES.includes(language) ? language : DEFAULT_LOCALE;
}

function getPath(source, key) {
  return key.split('.').reduce((value, segment) => value?.[segment], source);
}

function interpolate(template, parameters) {
  return template.replace(/\{(\w+)\}/g, (match, key) => (
    parameters[key] === undefined ? match : String(parameters[key])
  ));
}

export function translate(locale, key, parameters = {}) {
  const selectedLocale = normalizeLocale(locale);
  const value = getPath(MESSAGES[selectedLocale], key) ?? getPath(MESSAGES[DEFAULT_LOCALE], key);
  if (typeof value !== 'string') return key;
  return interpolate(value, parameters);
}

export function getRoomName(locale, roomType) {
  const selectedLocale = normalizeLocale(locale);
  return ROOM_NAMES[selectedLocale][roomType] ?? ROOM_NAMES[DEFAULT_LOCALE][roomType] ?? roomType;
}

export function getObjectCopy(locale, objectType) {
  const selectedLocale = normalizeLocale(locale);
  return OBJECT_COPY[selectedLocale][objectType] ?? OBJECT_COPY[DEFAULT_LOCALE][objectType];
}

export function getCaseTitle(locale, titleIndex) {
  const selectedLocale = normalizeLocale(locale);
  return CASE_TITLES[selectedLocale][titleIndex] ?? CASE_TITLES[DEFAULT_LOCALE][titleIndex];
}

export function getCaseTitleCount() {
  return CASE_TITLES[DEFAULT_LOCALE].length;
}

function createNameProfiles(locale, group, gender) {
  const selectedLocale = normalizeLocale(locale);
  return NAME_CATALOGS[selectedLocale][group].map((name, index) => Object.freeze({
    nameKey: `${group}.${index}`,
    name,
    gender,
    pronoun: translate(selectedLocale, `pronoun.${gender}`),
  }));
}

export function getCharacterNameProfiles(locale) {
  return Object.freeze([
    ...createNameProfiles(locale, 'female', 'f'),
    ...createNameProfiles(locale, 'male', 'm'),
  ]);
}

export function getVictimNameProfiles(locale) {
  return Object.freeze([
    ...createNameProfiles(locale, 'victimFemale', 'f'),
    ...createNameProfiles(locale, 'victimMale', 'm'),
  ]);
}

export function getNameProfile(locale, nameKey) {
  const [group, rawIndex] = String(nameKey).split('.');
  const index = Number(rawIndex);
  const gender = group === 'female' || group === 'victimFemale' ? 'f' : 'm';
  const selectedLocale = normalizeLocale(locale);
  const name = NAME_CATALOGS[selectedLocale]?.[group]?.[index]
    ?? NAME_CATALOGS[DEFAULT_LOCALE]?.[group]?.[index];
  return {
    nameKey,
    name,
    gender,
    pronoun: translate(selectedLocale, `pronoun.${gender}`),
  };
}

function flattenKeys(source, prefix = '') {
  return Object.entries(source).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === 'string' ? [path] : flattenKeys(value, path);
  });
}

export function getTranslationKeys(locale) {
  const selectedLocale = normalizeLocale(locale);
  return [
    ...flattenKeys(MESSAGES[selectedLocale]),
    ...Object.keys(ROOM_NAMES[selectedLocale]).map((key) => `rooms.${key}`),
    ...Object.entries(OBJECT_COPY[selectedLocale]).flatMap(([type, forms]) => (
      Object.keys(forms).map((form) => `objects.${type}.${form}`)
    )),
    ...CASE_TITLES[selectedLocale].map((_, index) => `titles.${index}`),
    ...Object.entries(NAME_CATALOGS[selectedLocale]).flatMap(([group, names]) => (
      names.map((_, index) => `names.${group}.${index}`)
    )),
  ].sort();
}

export function translateDocument(root, locale) {
  const selectedLocale = normalizeLocale(locale);
  root.querySelectorAll('[data-i18n]').forEach((element) => {
    element.textContent = translate(selectedLocale, element.dataset.i18n);
  });
  root.querySelectorAll('[data-i18n-aria-label]').forEach((element) => {
    element.setAttribute('aria-label', translate(selectedLocale, element.dataset.i18nAriaLabel));
  });
  root.documentElement?.setAttribute('lang', selectedLocale);
}
