import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ImageBackground,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  type TextInputProps,
  useWindowDimensions,
  View
} from "react-native";

import { Screen } from "@/components/ui";
import { checkSupabaseConnectivity, supabase, supabaseConfig } from "@/lib/supabase";
import { colors } from "@/lib/theme";

type Mode = "login" | "register";
type Role = "client" | "provider";
type RegisterField =
  | "role"
  | "name"
  | "phone"
  | "cpfCnpj"
  | "email"
  | "password"
  | "cep"
  | "number"
  | "clientNeed"
  | "cnpj"
  | "companyName"
  | "serviceArea"
  | "serviceDescription";

type RegisterQuestion = {
  field: RegisterField;
  title: string;
  helper: string;
  required: boolean;
  placeholder?: string;
  keyboardType?: TextInputProps["keyboardType"];
  secureTextEntry?: boolean;
  autoCapitalize?: TextInputProps["autoCapitalize"];
};

const questionCopy: Record<RegisterField, Omit<RegisterQuestion, "field">> = {
  role: {
    title: "Você quer contratar ou prestar serviços?",
    helper: "Essa resposta define as próximas perguntas e a tela inicial do seu perfil.",
    required: true
  },
  name: {
    title: "Como podemos te chamar?",
    helper: "Use seu nome completo para deixar o atendimento mais confiável.",
    required: true,
    placeholder: "Nome completo",
    autoCapitalize: "words"
  },
  phone: {
    title: "Qual é seu WhatsApp?",
    helper: "Usaremos para facilitar o contato sobre solicitações e propostas.",
    required: true,
    placeholder: "(00) 00000-0000",
    keyboardType: "phone-pad"
  },
  cpfCnpj: {
    title: "Qual é seu CPF ou CNPJ?",
    helper: "Esse dado fica vinculado ao seu perfil para identificação na plataforma.",
    required: true,
    placeholder: "CPF ou CNPJ",
    keyboardType: "number-pad"
  },
  email: {
    title: "Qual e-mail você quer usar para entrar?",
    helper: "Esse será seu login na plataforma.",
    required: true,
    placeholder: "exemplo@email.com",
    keyboardType: "email-address",
    autoCapitalize: "none"
  },
  password: {
    title: "Crie uma senha de acesso",
    helper: "Use pelo menos 6 caracteres.",
    required: true,
    placeholder: "mínimo 6 caracteres",
    secureTextEntry: true
  },
  cep: {
    title: "Qual é o CEP da sua região?",
    helper: "Ajuda a encontrar profissionais e oportunidades perto de você.",
    required: false,
    placeholder: "00000-000",
    keyboardType: "number-pad"
  },
  number: {
    title: "Número ou complemento do endereço",
    helper: "Opcional. Complete apenas se quiser deixar o endereço mais preciso.",
    required: false,
    placeholder: "123, bloco B, apto 45"
  },
  clientNeed: {
    title: "Que tipo de serviço você costuma precisar?",
    helper: "Opcional. Isso nos ajuda a personalizar sua experiência de cliente.",
    required: false,
    placeholder: "Ex.: limpeza, manutenção, pintura"
  },
  cnpj: {
    title: "Qual é o CNPJ da empresa?",
    helper: "Campo obrigatório para perfis de prestador.",
    required: true,
    placeholder: "00.000.000/0000-00",
    keyboardType: "number-pad"
  },
  companyName: {
    title: "Qual é a razão social ou nome comercial?",
    helper: "Informe como sua empresa deve aparecer para clientes.",
    required: true,
    placeholder: "Nome da empresa"
  },
  serviceArea: {
    title: "Em qual cidade ou região você atende?",
    helper: "Ajuda clientes próximos a encontrarem seus serviços.",
    required: true,
    placeholder: "Ex.: São Paulo/SP"
  },
  serviceDescription: {
    title: "Quais serviços você oferece?",
    helper: "Opcional. Descreva em poucas palavras suas principais especialidades.",
    required: false,
    placeholder: "Ex.: elétrica residencial e pequenos reparos"
  }
};

const clientFlow: RegisterField[] = ["role", "name", "phone", "cpfCnpj", "email", "password", "cep", "number"];
const providerFlow: RegisterField[] = ["role", "name", "phone", "cpfCnpj", "email", "password", "companyName", "serviceArea", "cep", "number", "serviceDescription"];

export default function AuthScreen() {
  const params = useLocalSearchParams<{ mode?: string }>();
  const { width } = useWindowDimensions();
  const isWide = width >= 980;
  const [mode, setMode] = useState<Mode>(params.mode === "register" ?"register" : "login");
  const [step, setStep] = useState(0);
  const [role, setRole] = useState<Role>("client");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [serviceArea, setServiceArea] = useState("");
  const [serviceDescription, setServiceDescription] = useState("");
  const [clientNeed, setClientNeed] = useState("");
  const [cep, setCep] = useState("");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchingAddress, setFetchingAddress] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const registerFlow = useMemo(() => (role === "provider" ?providerFlow : clientFlow), [role]);
  const currentField = registerFlow[Math.min(step, registerFlow.length - 1)];
  const currentQuestion: RegisterQuestion = { field: currentField, ...questionCopy[currentField] };
  const progress = ((step + 1) / registerFlow.length) * 100;
  const isFinalStep = step === registerFlow.length - 1;

  useEffect(() => {
    if (params.mode === "register") {
      setMode("register");
    }
  }, [params.mode]);

  const values: Record<RegisterField, string> = {
    role,
    name,
    phone,
    cpfCnpj,
    email,
    password,
    cep,
    number,
    clientNeed,
    cnpj,
    companyName,
    serviceArea,
    serviceDescription
  };

  const setters: Partial<Record<RegisterField, (value: string) => void>> = {
    name: setName,
    phone: setPhone,
    cpfCnpj: setCpfCnpj,
    email: setEmail,
    password: setPassword,
    cep: lookupCep,
    number: setNumber,
    clientNeed: setClientNeed,
    cnpj: setCnpj,
    companyName: setCompanyName,
    serviceArea: setServiceArea,
    serviceDescription: setServiceDescription
  };

  const resetRegisterFlow = () => {
    setStep(0);
    setMessage(null);
  };

  const switchMode = () => {
    setMode(mode === "login" ?"register" : "login");
    resetRegisterFlow();
  };

  const submitLogin = async () => {
    setLoading(true);
    setMessage(null);

    try {
      try {
        await checkSupabaseConnectivity();
      } catch {
        setMessage(
          `Não foi possível conectar ao Supabase em ${supabaseConfig.url}. Verifique a URL do projeto, DNS/rede do celular ou se o projeto está ativo.`
        );
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      });

      if (error) throw error;
      const userRole = data.user?.user_metadata?.role === "provider" ?"provider" : "client";
      router.replace(userRole === "provider" ?"/requests" : "/client");
    } catch (error) {
      setMessage(error instanceof Error ?error.message : "Não foi possível autenticar.");
    } finally {
      setLoading(false);
    }
  };

  const submitRegister = async () => {
    setLoading(true);
    setMessage(null);

    try {
      try {
        await checkSupabaseConnectivity();
      } catch {
        setMessage(
          `Não foi possível conectar ao Supabase em ${supabaseConfig.url}. Verifique a URL do projeto, DNS/rede do celular ou se o projeto está ativo.`
        );
        return;
      }

      const address = [street, number, neighborhood, city && state ?`${city}/${state}` : ""].filter(Boolean).join(", ");
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: name.trim(),
            phone: phone.trim(),
            cpf_cnpj: cpfCnpj.replace(/\D/g, ""),
            role,
            cep: cep.trim(),
            street: street.trim(),
            number: number.trim(),
            neighborhood: neighborhood.trim(),
            city: city.trim(),
            state: state.trim(),
            address,
            client_need: role === "client" ?clientNeed.trim() : undefined,
            razao_social: role === "provider" ?companyName.trim() : undefined,
            service_area: role === "provider" ?serviceArea.trim() : undefined,
            service_description: role === "provider" ?serviceDescription.trim() : undefined
          }
        }
      });

      if (error) throw error;
      if (data.user && data.session) {
        const { error: profileError } = await supabase.from("profiles").upsert(
          {
            id: data.user.id,
            role,
            full_name: name.trim(),
            phone: phone.trim(),
            cpf_cnpj: cpfCnpj.replace(/\D/g, ""),
            city: city.trim() || null,
            state: state.trim() || null
          },
          { onConflict: "id" }
        );

        if (profileError) throw profileError;
      }

      if (!data.session) {
        setMessage("Cadastro criado. Verifique seu e-mail antes de entrar.");
        setMode("login");
        resetRegisterFlow();
        return;
      }

      router.replace(role === "provider" ?"/requests" : "/client");
    } catch (error) {
      setMessage(error instanceof Error ?error.message : "Não foi possível criar sua conta.");
    } finally {
      setLoading(false);
    }
  };

  const validateStep = () => {
    const value = values[currentField]?.trim() ?? "";

    if (currentQuestion.required && !value) {
      setMessage("Responda esta pergunta para continuar.");
      return false;
    }

    if (currentField === "email" && !/^\S+@\S+\.\S+$/.test(value)) {
      setMessage("Informe um e-mail válido para continuar.");
      return false;
    }

    if (currentField === "password" && value.length < 6) {
      setMessage("A senha precisa ter pelo menos 6 caracteres.");
      return false;
    }

    if (currentField === "cpfCnpj" && ![11, 14].includes(value.replace(/\D/g, "").length)) {
      setMessage("Informe um CPF com 11 dígitos ou CNPJ com 14 dígitos.");
      return false;
    }

    if (currentField === "cnpj" && value.replace(/\D/g, "").length < 14) {
      setMessage("Informe um CNPJ com 14 dígitos.");
      return false;
    }

    setMessage(null);
    return true;
  };

  const nextRegisterStep = async () => {
    if (!validateStep()) return;
    if (isFinalStep) {
      await submitRegister();
      return;
    }
    setStep((current) => Math.min(current + 1, registerFlow.length - 1));
  };

  const skipStep = () => {
    if (currentQuestion.required || isFinalStep) return;
    setMessage(null);
    setStep((current) => Math.min(current + 1, registerFlow.length - 1));
  };

  const backRegisterStep = () => {
    if (step === 0) {
      setMode("login");
      resetRegisterFlow();
      return;
    }
    setMessage(null);
    setStep((current) => Math.max(current - 1, 0));
  };

  async function lookupCep(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, 8);
    setCep(digits.replace(/^(\d{5})(\d)/, "$1-$2"));

    if (digits.length !== 8) {
      return;
    }

    setFetchingAddress(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await response.json();
      if (!data.erro) {
        setStreet(data.logradouro || "");
        setNeighborhood(data.bairro || "");
        setCity(data.localidade || "");
        setState(data.uf || "");
      }
    } finally {
      setFetchingAddress(false);
    }
  }

  return (
    <Screen>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <View style={{ flex: 1, flexDirection: isWide ?"row" : "column" }}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => ({
              position: "absolute",
              top: isWide ?28 : 22,
              left: isWide ?32 : 24,
              zIndex: 10,
              alignItems: "center",
              justifyContent: "center",
              minHeight: 44,
              paddingHorizontal: 4,
              opacity: pressed ?0.82 : 1
            })}
          >
            <Text style={{ color: colors.gold, fontSize: 13, fontWeight: "900" }}>← Voltar</Text>
          </Pressable>

          {isWide ?<VisualPanel /> : null}

          <ScrollView
            contentInsetAdjustmentBehavior="automatic"
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
              flexGrow: 1,
              justifyContent: "center",
              paddingHorizontal: isWide ?76 : 24,
              paddingVertical: 42
            }}
            style={{ flex: 1 }}
          >
            <View style={{ width: "100%", maxWidth: 520, alignSelf: "center", gap: 30 }}>
              <View style={{ gap: 10 }}>
                <Text selectable style={{ color: colors.text, fontSize: 42, lineHeight: 46, fontWeight: "900", letterSpacing: 0 }}>
                  {mode === "login" ?"Bem-vindo de volta" : "Vamos criar seu perfil"}
                </Text>
                <Text selectable style={{ color: "rgba(247,242,232,0.45)", fontSize: 15, lineHeight: 23, fontWeight: "800" }}>
                  {mode === "login"
                    ?"Sentimos sua falta. Entre com seus dados."
                    : "Uma pergunta por vez, só com o necessário para começar."}
                </Text>
              </View>

              <View style={{ gap: 18 }}>
                {message ?(
                  <View
                    style={{
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: message.includes("criado") ?"rgba(50,213,131,0.25)" : "rgba(249,112,102,0.25)",
                      backgroundColor: message.includes("criado") ?"rgba(50,213,131,0.10)" : "rgba(249,112,102,0.10)",
                      padding: 14
                    }}
                  >
                    <Text selectable style={{ color: message.includes("criado") ?colors.success : colors.danger, fontSize: 13, fontWeight: "800", lineHeight: 20 }}>
                      {message}
                    </Text>
                  </View>
                ) : null}

                {mode === "register" ?(
                  <RegisterStep
                    currentQuestion={currentQuestion}
                    fetchingAddress={fetchingAddress}
                    isFinalStep={isFinalStep}
                    onBack={backRegisterStep}
                    onNext={nextRegisterStep}
                    onRoleChange={(nextRole) => {
                      setRole(nextRole);
                      setStep(1);
                      setMessage(null);
                    }}
                    onSkip={skipStep}
                    progress={progress}
                    role={role}
                    step={step}
                    totalSteps={registerFlow.length}
                    value={values[currentField] ?? ""}
                    onChangeText={setters[currentField]}
                    loading={loading}
                  />
                ) : (
                  <LoginForm
                    email={email}
                    loading={loading}
                    onEmailChange={setEmail}
                    onPasswordChange={setPassword}
                    onSubmit={submitLogin}
                    password={password}
                  />
                )}

                <View style={{ height: 1, backgroundColor: "rgba(255,255,255,0.07)", marginVertical: 4 }} />

                <Pressable onPress={switchMode} style={{ alignItems: "center", paddingVertical: 8 }}>
                  <Text style={{ color: "rgba(247,242,232,0.48)", fontSize: 14, fontWeight: "800" }}>
                    {mode === "login" ?"Novo por aqui?" : "Já possui uma conta?"}
                    <Text style={{ color: colors.gold, fontWeight: "900" }}>
                      {mode === "login" ?"Cadastrar-se" : "Fazer login"}
                    </Text>
                  </Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function LoginForm({
  email,
  loading,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  password
}: {
  email: string;
  loading: boolean;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: () => void;
  password: string;
}) {
  return (
    <View style={{ gap: 14 }}>
      <AuthField label="E-mail" value={email} onChangeText={onEmailChange} placeholder="exemplo@email.com" autoCapitalize="none" keyboardType="email-address" />
      <AuthField label="Senha de acesso" value={password} onChangeText={onPasswordChange} placeholder="mínimo 6 caracteres" secureTextEntry />
      <PrimaryButton disabled={loading} loading={loading} onPress={onSubmit}>
        {loading ?"Aguarde..." : "Continuar →"}
      </PrimaryButton>
    </View>
  );
}

function RegisterStep({
  currentQuestion,
  fetchingAddress,
  isFinalStep,
  loading,
  onBack,
  onChangeText,
  onNext,
  onRoleChange,
  onSkip,
  progress,
  role,
  step,
  totalSteps,
  value
}: {
  currentQuestion: RegisterQuestion;
  fetchingAddress: boolean;
  isFinalStep: boolean;
  loading: boolean;
  onBack: () => void;
  onChangeText?: (value: string) => void;
  onNext: () => void;
  onRoleChange: (role: Role) => void;
  onSkip: () => void;
  progress: number;
  role: Role;
  step: number;
  totalSteps: number;
  value: string;
}) {
  return (
    <View style={{ gap: 20 }}>
      <View style={{ gap: 10 }}>
        <View style={{ height: 6, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
          <View style={{ width: `${progress}%`, height: "100%", backgroundColor: colors.gold }} />
        </View>
        <Text style={{ color: "rgba(247,242,232,0.42)", fontSize: 12, fontWeight: "900" }}>
          Pergunta {step + 1} de {totalSteps}
        </Text>
      </View>

      <View style={{ gap: 10 }}>
        <Text selectable style={{ color: colors.text, fontSize: 26, lineHeight: 32, fontWeight: "900", letterSpacing: 0 }}>
          {fetchingAddress && currentQuestion.field === "cep" ?"Buscando seu endereço..." : currentQuestion.title}
        </Text>
        <Text selectable style={{ color: "rgba(247,242,232,0.48)", fontSize: 14, lineHeight: 22, fontWeight: "700" }}>
          {currentQuestion.helper}
        </Text>
      </View>

      {currentQuestion.field === "role" ?(
        <View style={{ gap: 12 }}>
          <RoleOption
            active={role === "client"}
            description="Quero solicitar serviços, receber propostas e acompanhar atendimentos."
            label="Sou cliente"
            onPress={() => onRoleChange("client")}
          />
          <RoleOption
            active={role === "provider"}
            description="Quero receber oportunidades e oferecer meus serviços."
            label="Sou prestador de serviço"
            onPress={() => onRoleChange("provider")}
          />
        </View>
      ) : (
        <AuthField
          autoCapitalize={currentQuestion.autoCapitalize}
          keyboardType={currentQuestion.keyboardType}
          label={currentQuestion.required ?"Obrigatório" : "Opcional"}
          onChangeText={onChangeText}
          placeholder={currentQuestion.placeholder}
          secureTextEntry={currentQuestion.secureTextEntry}
          value={value}
        />
      )}

      <View style={{ flexDirection: "row", gap: 10 }}>
        {step > 0 ?<SecondaryButton onPress={onBack}>Voltar</SecondaryButton> : null}
        {!currentQuestion.required && !isFinalStep ?<SecondaryButton onPress={onSkip}>Pular</SecondaryButton> : null}
        {currentQuestion.field !== "role" ?(
          <View style={{ flex: 1.3 }}>
            <PrimaryButton disabled={loading} loading={loading} onPress={onNext}>
              {loading ?"Aguarde..." : isFinalStep ?"Criar perfil →" : "Próxima →"}
            </PrimaryButton>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function RoleOption({
  active,
  description,
  label,
  onPress
}: {
  active: boolean;
  description: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        borderRadius: 8,
        borderWidth: 1,
        borderColor: active ?"rgba(184,146,74,0.72)" : "rgba(255,255,255,0.08)",
        backgroundColor: active ?"rgba(184,146,74,0.16)" : "rgba(255,255,255,0.04)",
        gap: 7,
        opacity: pressed ?0.82 : 1,
        padding: 16
      })}
    >
      <Text style={{ color: colors.text, fontSize: 16, fontWeight: "900" }}>{label}</Text>
      <Text selectable style={{ color: "rgba(247,242,232,0.48)", fontSize: 13, lineHeight: 19, fontWeight: "700" }}>
        {description}
      </Text>
    </Pressable>
  );
}

function PrimaryButton({
  children,
  disabled,
  loading,
  onPress
}: {
  children: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 56,
        borderRadius: 8,
        backgroundColor: colors.gold,
        alignItems: "center",
        justifyContent: "center",
        opacity: disabled ?0.55 : pressed ?0.82 : 1
      })}
    >
      <Text style={{ color: colors.text, fontSize: 15, fontWeight: "900" }}>{children}</Text>
    </Pressable>
  );
}

function SecondaryButton({ children, onPress }: { children: React.ReactNode; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 56,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.08)",
        backgroundColor: "rgba(255,255,255,0.04)",
        alignItems: "center",
        justifyContent: "center",
        opacity: pressed ?0.82 : 1,
        paddingHorizontal: 18
      })}
    >
      <Text style={{ color: "rgba(247,242,232,0.78)", fontSize: 14, fontWeight: "900" }}>{children}</Text>
    </Pressable>
  );
}

function VisualPanel() {
  return (
    <View style={{ flex: 1, overflow: "hidden" }}>
      <ImageBackground
        source={{ uri: "https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&q=80&w=1600" }}
        style={{ flex: 1, justifyContent: "space-between", padding: 72 }}
        imageStyle={{ opacity: 0.16 }}
      >
        <View style={{ ...absoluteFill, backgroundColor: "rgba(7,9,14,0.78)" }} />
        <View style={{ zIndex: 1 }}>
          <Text selectable style={{ color: colors.text, fontSize: 22, fontWeight: "900" }}>
            <Text style={{ color: colors.gold }}>W</Text>ORKING
          </Text>
        </View>

        <View style={{ zIndex: 1, gap: 26 }}>
          <View
            style={{
              alignSelf: "flex-start",
              borderRadius: 999,
              borderWidth: 1,
              borderColor: "rgba(184,146,74,0.24)",
              backgroundColor: "rgba(184,146,74,0.10)",
              paddingHorizontal: 14,
              paddingVertical: 8
            }}
          >
            <Text style={{ color: colors.gold, fontSize: 11, fontWeight: "900", textTransform: "uppercase" }}>Segurança em dobro</Text>
          </View>
          <Text selectable style={{ color: colors.text, fontSize: 54, lineHeight: 55, fontWeight: "900", letterSpacing: 0 }}>
            A maior rede de{"\n"}profissionais do{"\n"}
            <Text style={{ color: "#D7B46A" }}>Brasil.</Text>
          </Text>
          <Text selectable style={{ color: "rgba(247,242,232,0.48)", fontSize: 16, lineHeight: 26, fontWeight: "700", maxWidth: 430 }}>
            Junte-se a milhares de usuários que transformam sua rotina com agilidade e confiança.
          </Text>

          <View style={{ flexDirection: "row", gap: 12 }}>
            {[
              { value: "+10k", label: "Clientes" },
              { value: "+500", label: "Profissionais" },
              { value: "4.9★", label: "Avaliação" }
            ].map((item) => (
              <View
                key={item.label}
                style={{
                  flex: 1,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.08)",
                  backgroundColor: "rgba(255,255,255,0.035)",
                  padding: 16,
                  alignItems: "center",
                  gap: 6
                }}
              >
                <Text style={{ color: colors.gold, fontSize: 22, fontWeight: "900" }}>{item.value}</Text>
                <Text style={{ color: "rgba(247,242,232,0.35)", fontSize: 10, fontWeight: "900", textTransform: "uppercase" }}>{item.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View
          style={{
            zIndex: 1,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.08)",
            backgroundColor: "rgba(255,255,255,0.035)",
            padding: 16
          }}
        >
          <Text selectable style={{ color: colors.text, fontSize: 13, fontWeight: "900" }}>+100 serviços concluídos agora</Text>
          <Text selectable style={{ color: "rgba(247,242,232,0.38)", fontSize: 11, fontWeight: "700", marginTop: 4 }}>Plataforma em operação 24h</Text>
        </View>
      </ImageBackground>
    </View>
  );
}

function AuthField(props: React.ComponentProps<typeof TextInput> & { label: string }) {
  const { label, ...inputProps } = props;
  const [passwordVisible, setPasswordVisible] = useState(false);
  const isPassword = Boolean(inputProps.secureTextEntry);

  return (
    <View style={{ gap: 8 }}>
      <Text selectable style={{ color: "rgba(247,242,232,0.44)", fontSize: 10, fontWeight: "900", textTransform: "uppercase" }}>
        {label}
      </Text>
      <View>
        <TextInput
          placeholderTextColor="rgba(247,242,232,0.25)"
          {...inputProps}
          secureTextEntry={isPassword ?!passwordVisible : inputProps.secureTextEntry}
          style={[
            {
              minHeight: 54,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.08)",
              backgroundColor: "rgba(255,255,255,0.04)",
              color: colors.text,
              fontSize: 15,
              fontWeight: "800",
              paddingLeft: 16,
              paddingRight: isPassword ?52 : 16
            },
            inputProps.style
          ]}
        />
        {isPassword ?(
          <Pressable
            accessibilityLabel={passwordVisible ?"Ocultar senha" : "Mostrar senha"}
            onPress={() => setPasswordVisible((current) => !current)}
            style={({ pressed }) => ({
              position: "absolute",
              right: 12,
              top: 0,
              bottom: 0,
              width: 36,
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ?0.72 : 1
            })}
          >
            <Ionicons name={passwordVisible ?"eye-off-outline" : "eye-outline"} size={22} color={colors.gold} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const absoluteFill = {
  position: "absolute" as const,
  top: 0,
  right: 0,
  bottom: 0,
  left: 0
};
