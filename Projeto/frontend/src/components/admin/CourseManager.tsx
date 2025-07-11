import React, { useState, useEffect } from "react";
import { Curso } from "../../interface/Curso";
import { Aluno } from "../../interface/Aluno";
import api from "../../services/api";
import "../../styles/course_manager.css";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import Chip from "@mui/material/Chip";

const CourseManager: React.FC = () => {
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [alunosCurso, setAlunosCurso] = useState<{ [key: number]: Aluno[] }>({});
  const [certificados, setCertificados] = useState<{ [key: number]: { [key: number]: boolean } }>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedAlunos, setSelectedAlunos] = useState<number[]>([]);
  const [formData, setFormData] = useState<Curso>({
    id_curso: 0,
    nome_curso: "",
    qtd_horas: 0,
    link_certificado: "",
    alunos: [],
  });

  useEffect(() => {
    const fetchCursos = async () => {
      try {
        const response = await api.get("/cursos");
        setCursos(response.data);
      } catch (err) {
        console.error("Erro ao buscar cursos:", err);
      }
    };

    const fetchAlunos = async () => {
      try {
        const response = await api.get("/alunos");
        setAlunos(response.data);
      } catch (err) {
        console.error("Erro ao buscar alunos:", err);
      }
    };

    fetchCursos();
    fetchAlunos();
  }, []);

  const toggleExpand = async (id: number) => {
    if (expanded === id) {
      setExpanded(null);
    } else {
      try {
        const response = await api.get(`/certificado/curso/${id}`);
        const alunosCertificados = response.data.map((cert: any) => cert.Aluno);
        const statusMap: { [key: number]: boolean } = {};
        response.data.forEach((cert: any) => {
          statusMap[cert.id_aluno] = cert.esta_certificado;
        });
        setAlunosCurso((prev) => ({ ...prev, [id]: alunosCertificados }));
        setCertificados((prev) => ({ ...prev, [id]: statusMap }));
      } catch (err) {
        console.error("Erro ao buscar alunos do curso:", err);
      }
      setExpanded(id);
    }
  };

  const toggleCertificadoAluno = async (idCurso: number, idAluno: number) => {
    const novoStatus = !certificados[idCurso]?.[idAluno];
    setCertificados((prev) => ({
      ...prev,
      [idCurso]: {
        ...prev[idCurso],
        [idAluno]: novoStatus,
      },
    }));

    try {
      await api.put(`/certificado/${idAluno}/${idCurso}`, {
        esta_certificado: novoStatus,
        status: novoStatus ? 'Concluído' : 'Removido',
        data_conclusao: novoStatus ? new Date().toISOString() : null,
      });
    } catch (err) {
      console.error('Erro ao atualizar certificado do aluno', err);
    }
  };

  const toggleTodosAlunos = async (idCurso: number) => {
    const alunosDoCurso = alunosCurso[idCurso] || [];

    for (const aluno of alunosDoCurso) {
      await toggleCertificadoAluno(idCurso, aluno.aluno_id);
    }
  };

  const handleEdit = async (curso: Curso) => {
    try {
      const response = await api.get(`/certificado/curso/${curso.id_curso}`);
      const alunosVinculados = response.data.map((cert: any) => cert.id_aluno);

      setFormData(curso);
      setSelectedAlunos(alunosVinculados);
      setEditMode(true);
      setModalOpen(true);
    } catch (err) {
      console.error("Erro ao buscar certificados:", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editMode) {
        await api.put(`/cursos/${formData.id_curso}`, {
          nome_curso: formData.nome_curso,
          qtd_horas: formData.qtd_horas,
          link_certificado: formData.link_certificado,
        });

        const response = await api.get(`/certificado/curso/${formData.id_curso}`);
        const atuais = response.data.map((cert: any) => cert.id_aluno);

        const remover = atuais.filter((id: number) => !selectedAlunos.includes(id));
        const adicionar = selectedAlunos.filter((id) => !atuais.includes(id));

        if (remover.length > 0 && window.confirm("Deseja remover alunos desse curso?")) {
          for (const id_aluno of remover) {
            await api.delete(`/certificado/${id_aluno}/${formData.id_curso}`);
          }
        }

        if (adicionar.length > 0) {
          const novosCertificados = adicionar.map((id_aluno) => ({
            id_curso: formData.id_curso,
            id_aluno,
            esta_certificado: false,
            status: "Nao iniciado",
            data_conclusao: null,
          }));

          await api.post("/certificado", { certificados: novosCertificados });
        }

        alert("Curso atualizado com sucesso!");
      } else {
        const novoCurso = {
          nome_curso: formData.nome_curso,
          qtd_horas: formData.qtd_horas,
          link_certificado: formData.link_certificado,
        };

        const response = await api.post("/cursos", novoCurso);
        setCursos([...cursos, response.data]);

        alert("Curso cadastrado com sucesso!");
      }

      setFormData({
        id_curso: 0,
        nome_curso: "",
        qtd_horas: 0,
        link_certificado: "",
        alunos: [],
      });
      setSelectedAlunos([]);
      setEditMode(false);
      setModalOpen(false);

    } catch (err) {
      console.error("Erro ao salvar curso:", err);
      alert("Erro ao salvar curso.");
    }
  };

  return (
    <div className="courseManager">
      <div className="managerHeader">
        <h2>Cursos Cadastrados</h2>
        <button onClick={() => {
          setFormData({
            id_curso: 0,
            nome_curso: "",
            qtd_horas: 0,
            link_certificado: "",
            alunos: [],
          });
          setSelectedAlunos([]);
          setEditMode(false);
          setModalOpen(true);
        }}>
          Adicionar Curso
        </button>
      </div>

      <div className="gridCursos">
        {cursos.map((curso) => (
          <div
            key={curso.id_curso}
            className="cursoCard"
            onClick={() => toggleExpand(curso.id_curso)}
          >
            <div className="cursoHeader">
              <span>{curso.nome_curso}</span>
              <span>{curso.qtd_horas} horas</span>
              <EditIcon
                onClick={(e) => {
                  e.stopPropagation();
                  handleEdit(curso);
                }}
              />
              
              
            </div>

            {expanded === curso.id_curso && (
              <div className="cursoDetalhes">
                <button onClick={(e) => { e.stopPropagation(); toggleTodosAlunos(curso.id_curso); }}>
                  Alternar Todos os Certificados
                </button>
                <table className="tabelaAlunos">
                  <thead>
                    <tr>
                      <th>Nome do Aluno</th>
                      <th>RA</th>
                      <th>Certificado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alunosCurso[curso.id_curso]?.map((aluno) => (
                      <tr key={aluno.aluno_id}>
                        <td>{aluno.nome_aluno}</td>
                        <td>{aluno.ra_aluno}</td>
                        <td>
                          <input
                            type="checkbox"
                            checked={certificados[curso.id_curso]?.[aluno.aluno_id] || false}
                            onChange={(e) => {
                              e.stopPropagation();
                              toggleCertificadoAluno(curso.id_curso, aluno.aluno_id);
                            }}
                          />
                        </td>
                      </tr>
                    )) || (
                      <tr>
                        <td colSpan={3}>Nenhum aluno vinculado</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>

      {modalOpen && (
        <div className="modal">
          <form onSubmit={handleSubmit} className="modalForm">
            <h3>{editMode ? "Editar Curso" : "Novo Curso"}</h3>
            <input
              type="text"
              placeholder="Nome do curso"
              value={formData.nome_curso}
              onChange={(e) => setFormData({ ...formData, nome_curso: e.target.value })}
              required
            />
            <input
              type="number"
              placeholder="Carga horária"
              value={formData.qtd_horas}
              onChange={(e) => setFormData({ ...formData, qtd_horas: Number(e.target.value) })}
              required
            />
            <input
              type="text"
              placeholder="Link para certificado"
              value={formData.link_certificado}
              onChange={(e) => setFormData({ ...formData, link_certificado: e.target.value })}
              required
            />

            {editMode && (
            <Autocomplete
                    multiple
                    disableClearable
                    options={alunos}
                    getOptionLabel={(option) =>
                      `${option.nome_aluno} (${option.ra_aluno})`
                    }
                    value={alunos.filter((a) =>
                      selectedAlunos.includes(a.aluno_id)
                    )}
                    onChange={(event, newValue) => {
                      setSelectedAlunos(newValue.map((a) => a.aluno_id));
                    }}
                    renderTags={(value, getTagProps) =>
                      value.map((option, index) => (
                        <Chip
                          {...getTagProps({ index })}
                          label={`${option.nome_aluno} (${option.ra_aluno})`}
                          key={option.aluno_id}
                          style={{ margin: 4 }}
                        />
                      ))
                    }
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        variant="outlined"
                        label="Selecione alunos"
                        placeholder="Alunos"
                        fullWidth
                      />
                    )}
                    sx={{
                      width: "100%",
                      position: "relative",
                      "& .MuiOutlinedInput-root": {
                        display: "flex",
                        flexDirection: "column-reverse",
                        alignItems: "flex-start",
                        paddingTop: "8px",
                      },
                      "& .MuiAutocomplete-inputRoot": {
                        width: "100%",
                      },
                      "& .MuiAutocomplete-input": {
                        width: "100% !important",
                        minWidth: 1,
                        flexGrow: 1,
                      },
                      "& .MuiAutocomplete-tag": {
                        maxWidth: "100%",
                      },
                      "& .MuiAutocomplete-endAdornment": {
                        position: "absolute", // ❗ torna posicionável
                        top: 30, // ❗ alinha ao topo do input
                        right: 8, // ❗ encosta no lado direito
                        
                      },
                    }}
                  />
            )}

            <button type="submit">{editMode ? "Salvar alterações" : "Cadastrar"}</button>
            <button type="button" onClick={() => setModalOpen(false)}>
              Cancelar
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default CourseManager;
