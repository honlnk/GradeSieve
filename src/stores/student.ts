import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { db } from '@/db'
import type { Student } from '@/types'

export const useStudentStore = defineStore('student', () => {
  const students = ref<Student[]>([])
  const loaded = ref(false)

  async function load() {
    students.value = await db.students.toArray()
    loaded.value = true
  }

  async function replaceAll(list: Student[]) {
    await db.transaction('rw', db.students, async () => {
      await db.students.clear()
      if (list.length) await db.students.bulkAdd(list)
    })
    await load()
  }

  const count = computed(() => students.value.length)

  function clear() {
    students.value = []
    loaded.value = false
    return db.students.clear()
  }

  return { students, loaded, count, load, replaceAll, clear }
})
