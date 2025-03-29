import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../GlobalStyles.css';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

const ORBIT = () => {
  const [titles, setTitles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTitle, setSelectedTitle] = useState(null);
  const [subNarratives, setSubNarratives] = useState([]);
  const [subLoading, setSubLoading] = useState(false);
  const [selectedSubNarrative, setSelectedSubNarrative] = useState(null);
  const [strategyOptions, setStrategyOptions] = useState({ content: [], delivery: [], deployment: [] });
  const [stagingArea, setStagingArea] = useState([]);
  const [activeTab, setActiveTab] = useState('strategy');
  const [personas, setPersonas] = useState([]);
  const [simulationResult, setSimulationResult] = useState(null);

  const fetchTitles = async () => {
    try {
      const requestPayload = {
        query: "Turkish Protests",
        sources: [],
        countries: [],
        topics: [],
        keywords: [],
        update_timestamp: [],
        links: [],
        tracker_type: [],
        cluster: true,
        cluster_similarity_threshold: 0.6,
        set_size: 20,
        get_biggest: false,
        get_last_update: true,
        smart: true,
        russia: true
      };
      const response = await axios.post("http://localhost:5000/search", requestPayload);
      const extractedTitles = response.data.map((item) => ({
        id: item.id,
        title: item.source.cluster_title,
        summary: item.source.cluster_summary,
        timestamp: item.source.creation_timestamp
      }));
      setTitles(extractedTitles);
    } catch (error) {
      console.error("Error fetching titles:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTitles(); }, []);

  const handleSelectChange = async (e) => {
    const selectedId = e.target.value;
    const selected = titles.find((t) => t.id === selectedId);
    setSelectedTitle(selected);
    setSelectedSubNarrative(null);
    setSubLoading(true);
    try {
      const response = await axios.post("http://localhost:5000/generate-subnarratives", { cluster_id: selected.id });
      setSubNarratives(response.data.sub_narratives || []);
    } catch (error) {
      console.error("Error fetching sub-narratives:", error);
    } finally {
      setSubLoading(false);
    }
  };

  const handleSubNarrativeClick = async (text) => {
    setSelectedSubNarrative(text);
    try {
      const response = await axios.post("http://localhost:5000/generate-strategy-options", { sub_narrative: text });
      setStrategyOptions(response.data);
      setStagingArea([]);
      const personaResponse = await axios.post("http://localhost:5000/generate-personas", { sub_narrative: text });
      setPersonas(personaResponse.data);
      setSimulationResult(null);
    } catch (error) {
      console.error("Error fetching strategy options or personas:", error);
    }
  };

  const handleDrop = (category, strategy) => {
    setStagingArea(prev => [...prev, { category, strategy }]);
  };

  const handleRunSimulation = async () => {
    try {
      const res = await axios.post("http://localhost:5000/run-simulation", {
        personas,
        staging_area: stagingArea
      });
      setSimulationResult(res.data);
    } catch (err) {
      console.error("Simulation error:", err);
    }
  };

  const formatList = (text) => text.split(/\n|\r/).filter(l => l.trim().startsWith('-')).map(l => l.replace(/^\s*-\s*/, ''));

  const renderStrategyOptions = () => (
    <div style={{ display: 'flex', gap: '20px' }}>
      {['content', 'delivery', 'deployment'].map((cat, i) => (
        <div key={i} style={{ flex: 1 }}>
          <h4 style={{ textTransform: 'capitalize' }}>{cat} Strategies</h4>
          {strategyOptions[cat].map((opt, idx) => (
            <div key={idx} onClick={() => handleDrop(cat, opt)}
              style={{ padding: '10px', borderRadius: '10px', backgroundColor: '#f0f0f0', marginBottom: '10px', cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
              {opt}
            </div>
          ))}
        </div>
      ))}
      <div style={{ flex: 1, backgroundColor: '#fefefe', border: '1px dashed #aaa', padding: '15px', borderRadius: '12px' }}>
        <h4>Staging Area</h4>
        {stagingArea.length === 0 ? <p>Click strategies above to build a counter-message.</p> : (
          stagingArea.map((block, i) => (
            <div key={i} style={{ marginBottom: '8px', backgroundColor: '#e8f4ff', padding: '10px', borderRadius: '8px' }}>
              <strong>{block.category}:</strong> {block.strategy}
            </div>
          ))
        )}
      </div>
    </div>
  );

  const renderPersonas = () => (
    <div style={{ padding: '20px', backgroundColor: '#f9f9f9', borderRadius: '10px' }}>
      <h3>Digital Twin Personas</h3>
      {personas.length === 0 ? <p>Loading personas...</p> : (
        personas.map((p, i) => (
          <div key={i} style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#fff', borderRadius: '10px', boxShadow: '0 2px 6px rgba(0,0,0,0.08)' }}>
            <h4>{p.name} — <span style={{ fontStyle: 'italic' }}>{p.archetype}</span></h4>
            <p><strong>Values:</strong> {p.values.join(', ')}</p>
            <p><strong>Media Diet:</strong> {p.media_diet.join(', ')}</p>
            <p><strong>Belief Network:</strong></p>
            <ul>{p.belief_network.map((b, j) => <li key={j}>{b}</li>)}</ul>
          </div>
        ))
      )}
    </div>
  );

  return (
    <div style={{ padding: '20px' }}>
      <h1 style={{ textAlign: 'center' }}>ORBIT: Narrative Selection</h1>
      {loading ? <p>Loading...</p> : (
        <select onChange={handleSelectChange} value={selectedTitle?.id || ''}
          style={{ padding: '12px', width: '80%', fontSize: '18px', margin: '20px auto', display: 'block', borderRadius: '20px' }}>
          <option value="" disabled>Select a Narrative</option>
          {titles.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
        </select>
      )}

      {selectedTitle && (
        <div>
          <h3>{selectedTitle.title}</h3>
          <ul>{formatList(selectedTitle.summary).map((s, i) => <li key={i}>{s}</li>)}</ul>
        </div>
      )}

      {subLoading ? <p>Loading sub-narratives...</p> : (
        subNarratives.map((text, i) => (
          formatList(text).map((line, j) => (
            <div key={`${i}-${j}`} onClick={() => handleSubNarrativeClick(line)}
              style={{ backgroundColor: '#eef7ff', padding: '12px 16px', borderRadius: '20px', marginBottom: '10px', cursor: 'pointer' }}>
              {line}
            </div>
          ))
        ))
      )}

      {selectedSubNarrative && (
        <div>
          <h2 style={{ marginTop: '30px' }}>Target Sub-Narrative</h2>
          <p style={{ fontStyle: 'italic', marginBottom: '20px' }}>{selectedSubNarrative}</p>

          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px', gap: '10px' }}>
            <button onClick={() => setActiveTab('strategy')} style={{ padding: '10px 20px', borderRadius: '10px', backgroundColor: activeTab === 'strategy' ? '#007BFF' : '#ccc', color: 'white' }}>Messaging Strategy</button>
            <button onClick={() => setActiveTab('persona')} style={{ padding: '10px 20px', borderRadius: '10px', backgroundColor: activeTab === 'persona' ? '#007BFF' : '#ccc', color: 'white' }}>Digital Twin Personas</button>
          </div>

          {activeTab === 'strategy' ? renderStrategyOptions() : renderPersonas()}

          {personas.length > 0 && stagingArea.length > 0 && (
            <div style={{ textAlign: 'center', marginTop: '30px' }}>
              <button onClick={handleRunSimulation} style={{ padding: '12px 24px', fontSize: '18px', backgroundColor: '#28a745', color: 'white', borderRadius: '12px', border: 'none', cursor: 'pointer' }}>
                GO
              </button>
            </div>
          )}

          {simulationResult && (
            <div style={{ marginTop: '30px', backgroundColor: '#f0f0f0', padding: '20px', borderRadius: '10px' }}>
              <h3>📊 Simulation Results</h3>
              {simulationResult.results.map((r, idx) => (
                <p key={idx}><strong>{r.persona}</strong> ({r.archetype}): {r.positive} 👍 / {r.negative} 👎</p>
              ))}
              <p style={{ marginTop: '10px', fontStyle: 'italic' }}>{simulationResult.summary}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ORBIT;
