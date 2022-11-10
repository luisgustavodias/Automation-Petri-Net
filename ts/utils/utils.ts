export async function delay(ms: number) {
    return new Promise(resolve => {
        setTimeout(() => { resolve(undefined) }, ms)
    })
}

export function shuffle<T>(array: T[]) {
    let currentIndex = array.length,  randomIndex;

    while (currentIndex != 0) {
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;
      
      [array[currentIndex], array[randomIndex]] = [
        array[randomIndex], array[currentIndex]];
    }
  
    return array;
  }