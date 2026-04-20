using UnityEngine;
using System.Collections.Generic;
using System;

namespace Paradigm SDK {
  public class ParadigmUnity : MonoBehaviour {
    private static ParadigmUnity instance;
    private Kernel kernel;
    private Dictionary<string, UniversalSeed> seeds = new Dictionary<string, UniversalSeed>();
    private Dictionary<string, GameObject> spawnedSeeds = new Dictionary<string, GameObject>();

    public static ParadigmUnity Instance {
      get { return instance; }
    }

    void Awake() {
      if (instance == null) {
        instance = this;
        kernel = new Kernel();
        kernel.Initialize();
      }
    }

    void Update() {
      kernel.GetTick().Update();
    }

    public UniversalSeed CreateSeed(string name, Dictionary<string, object> genes = null) {
      var seed = new UniversalSeed();
      seed.SetMetadata("name", name);

      if (genes != null) {
        foreach (var kvp in genes) {
          seed.SetGene(kvp.Key, kvp.Value);
        }
      }

      seeds[seed.Id] = seed;
      return seed;
    }

    public void SpawnSeed(string seedId, Vector3 position) {
      if (!seeds.ContainsKey(seedId)) return;

      var seed = seeds[seedId];
      var color = seed.GetGeneValue("color") as float[];
      var shape = seed.GetGeneValue("shape") as string;

      GameObject obj = GameObject.CreatePrimitive(
        shape == "sphere" ? PrimitiveType.Sphere :
        shape == "cube" ? PrimitiveType.Capsule : PrimitiveType.Quad
      );

      obj.name = seed.GetMetadata().name;
      obj.transform.position = position;

      if (color != null && color.Length >= 3) {
        var renderer = obj.GetComponent<Renderer>();
        renderer.material.color = new Color(color[0], color[1], color[2]);
      }

      spawnedSeeds[seedId] = obj;
    }

    public UniversalSeed Breed(string parentAId, string parentBId) {
      if (!seeds.ContainsKey(parentAId) || !seeds.ContainsKey(parentBId)) return null;

      var parentA = seeds[parentAId];
      var parentB = seeds[parentBId];
      var child = parentA.Breed(parentB, () => UnityEngine.Random.value);

      seeds[child.Id] = child;
      return child;
    }

    public UniversalSeed Mutate(string seedId, float intensity = 0.1f) {
      if (!seeds.ContainsKey(seedId)) return null;

      var seed = seeds[seedId];
      var mutated = seed.Mutate(() => UnityEngine.Random.value, intensity);

      seeds[mutated.Id] = mutated;
      return mutated;
    }

    public GeneticResult Evolve(Dictionary<string, UniversalSeed> population, Func<UniversalSeed, float> fitnessFn) {
      var ga = new GeneticAlgorithm();
      return ga.Evolve(population.Values.ToList(), fitnessFn);
    }

    void OnDestroy() {
      kernel?.Shutdown();
    }
  }

  public class Kernel {
    private Xoshiro256SS rng;
    private FIM fim;
    private TickSystem tick;

    public void Initialize() {
      rng = new Xoshiro256SS(DateTime.Now.Ticks);
      fim = new FIM();
      tick = new TickSystem();
      tick.Start();
    }

    public Xoshiro256SS GetRNG() => rng;
    public FIM GetFIM() => fim;
    public TickSystem GetTick() => tick;

    public void Shutdown() {
      tick.Stop();
    }
  }

  public class Xoshiro256SS {
    public uint[] s = new uint[8];

    public Xoshiro256SS(long seed) {
      uint z = (uint)seed;
      for (int i = 0; i < 8; i++) {
        z = (uint)((z ^ (z >> 30)) * 0xbf58476d1ce4e5b9);
        s[i] = (z ^ (z >> 27));
      }
    }

    public float NextFloat() {
      return Next() / 4294967296f;
    }

    public uint Next() {
      uint t = s[1] << 17;
      s[2] ^= s[0];
      s[5] ^= s[1];
      s[1] ^= s[2];
      s[7] ^= s[3];
      s[3] ^= s[4];
      s[4] ^= s[5];
      s[0] ^= s[6];
      s[6] ^= s[7];
      s[6] ^= t;
      return (s[1] << 17) ^ s[5];
    }
  }

  public class FIM {
    private double foldProbability = 0.1;
    private int generation = 0;

    public bool ShouldFold(float random) {
      return random < foldProbability;
    }

    public void CreateInitialState(Dictionary<string, object> data) {
      generation++;
    }

    public int GetGeneration() => generation;
  }

  public class TickSystem {
    private long tick = 0;
    private bool isRunning = false;
    private float deltaTime = 0;

    public void Start() {
      isRunning = true;
    }

    public void Stop() {
      isRunning = false;
    }

    public void Update() {
      if (isRunning) {
        tick++;
        deltaTime = Time.deltaTime;
      }
    }

    public long GetTick() => tick;
    public float GetDeltaTime() => deltaTime;
    public bool IsActive() => isRunning;
  }

  public class UniversalSeed {
    public string Id { get; private set; }
    private Dictionary<string, object> genes = new Dictionary<string, object>();
    private Dictionary<string, object> metadata = new Dictionary<string, object>();

    public UniversalSeed() {
      Id = Guid.NewGuid().ToString();
      metadata["created"] = DateTime.Now.Ticks;
    }

    public void SetGene(string type, object value) {
      genes[type] = value;
    }

    public object GetGeneValue(string type) {
      return genes.ContainsKey(type) ? genes[type] : null;
    }

    public void SetMetadata(string key, object value) {
      metadata[key] = value;
    }

    public Dictionary<string, object> GetMetadata() => metadata;

    public UniversalSeed Mutate(Func<float> rng, float intensity) {
      var clone = new UniversalSeed();
      foreach (var kvp in genes) {
        clone.genes[kvp.Key] = kvp.Value;
      }
      clone.metadata["lineage"] = new List<string> { Id };
      return clone;
    }

    public UniversalSeed Breed(UniversalSeed other, Func<float> rng) {
      var child = new UniversalSeed();
      foreach (var kvp in genes) {
        if (rng() < 0.5f) child.genes[kvp.Key] = kvp.Value;
        else if (other.genes.ContainsKey(kvp.Key)) child.genes[kvp.Key] = other.genes[kvp.Key];
      }
      child.metadata["lineage"] = new List<string> { Id, other.Id };
      return child;
    }
  }

  public class GeneticAlgorithm {
    public GeneticResult Evolve(List<UniversalSeed> population, Func<UniversalSeed, float> fitnessFn) {
      population.Sort((a, b) => fitnessFn(b).CompareTo(fitnessFn(a)));
      return new GeneticResult { BestSeed = population[0], Generation = 100 };
    }
  }

  public class GeneticResult {
    public UniversalSeed BestSeed { get; set; }
    public int Generation { get; set; }
  }
}

#if UNITY_EDITOR
[UnityEditor.CustomEditor(typeof(ParadigmUnity))]
public class ParadigmUnityEditor : UnityEditor.Editor { }
#endif