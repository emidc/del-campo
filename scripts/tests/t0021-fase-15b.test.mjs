// T-0021, Fase 15b: corre dentro de `pnpm check` los tests de los CSV sintéticos, del validador
// con sus casos inválidos y del export ciego. Los tests viven junto a su código en
// SPIKES/T-0021/v0/fase-15/ (fuera del workspace, como el arnés de regresión); este archivo sólo
// los importa para que nada más los obligue a seguir pasando.

import '../../SPIKES/T-0021/v0/fase-15/sinteticos/sinteticos.test.ts'
import '../../SPIKES/T-0021/v0/fase-15/invalidos/invalidos.test.ts'
import '../../SPIKES/T-0021/v0/fase-15/export-ciego/export-ciego.test.ts'
