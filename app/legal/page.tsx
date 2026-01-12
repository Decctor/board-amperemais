import Logo from "@/utils/svgs/logos/RECOMPRA - ICON - COLORFUL.svg";
import Image from "next/image";
import React from "react";

export default function LegalPage() {
	return (
		<div className="min-h-screen bg-gray-50">
			{/* Header */}
			<header className="bg-[#121212] shadow-sm">
				<div className="max-w-5xl flex items-center justify-center mx-auto px-4 py-6 sm:px-6 lg:px-8 ">
					<div className="flex items-center gap-4">
						<Image src={Logo} alt="Logo" width={50} height={50} />
						<h1 className="text-3xl font-bold text-white">Termos de Uso e Política de Privacidade</h1>
					</div>
				</div>
			</header>

			{/* Content */}
			<main className="max-w-5xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
				<div className="bg-white shadow-md rounded-lg p-8 space-y-8">
					{/* Última Atualização */}
					<div className="text-sm text-gray-600 border-b pb-4">
						<p>
							<strong>Última atualização:</strong> {new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
						</p>
					</div>

					{/* Introdução */}
					<section>
						<h2 className="text-2xl font-bold text-gray-900 mb-4">1. Introdução</h2>
						<p className="text-gray-700 leading-relaxed mb-4">
							Este documento estabelece os Termos de Uso e a Política de Privacidade da plataforma RecompraCRM, uma solução B2B SaaS destinada a empresas do
							setor varejista. Nossa plataforma oferece um conjunto integrado de ferramentas para impulsionar o crescimento e eficiência do seu negócio.
						</p>
						<p className="text-gray-700 leading-relaxed mb-4">
							<strong>Serviços Oferecidos:</strong>
						</p>
						<ul className="list-disc list-inside text-gray-700 leading-relaxed space-y-2 ml-4">
							<li>
								<strong>Inteligência de Negócio (Business Intelligence):</strong> Análise avançada de dados, dashboards interativos, relatórios customizados e
								insights estratégicos para tomada de decisão;
							</li>
							<li>
								<strong>CRM com Automação de Marketing:</strong> Gestão de relacionamento com clientes, campanhas de marketing automatizadas via WhatsApp,
								segmentação de público e funis de vendas;
							</li>
							<li>
								<strong>Hub de Atendimento WhatsApp:</strong> Central unificada para atendimento ao cliente via WhatsApp, gestão de conversas, múltiplos
								atendentes e histórico completo.
							</li>
						</ul>
						<p className="text-gray-700 leading-relaxed mt-4">
							Ao contratar e utilizar nossa plataforma, sua empresa concorda com os termos aqui estabelecidos.
						</p>
					</section>

					{/* Termos de Uso */}
					<section>
						<h2 className="text-2xl font-bold text-gray-900 mb-4 border-t pt-6">2. Termos de Uso</h2>

						<div className="space-y-4">
							<div>
								<h3 className="text-xl font-semibold text-gray-800 mb-2">2.1. Descrição do Serviço</h3>
								<p className="text-gray-700 leading-relaxed">
									A plataforma é uma solução SaaS (Software as a Service) que fornece ferramentas integradas de análise de dados, gestão de relacionamento com
									clientes e automação de comunicação via WhatsApp. O serviço é prestado de forma contínua, mediante contratação de plano de assinatura, e
									acessível via navegador web.
								</p>
							</div>

							<div>
								<h3 className="text-xl font-semibold text-gray-800 mb-2">2.2. Cadastro e Contas de Usuário</h3>
								<ul className="list-disc list-inside text-gray-700 leading-relaxed space-y-2 ml-4">
									<li>O serviço é destinado exclusivamente a pessoas jurídicas (empresas);</li>
									<li>O cadastro deve ser realizado com informações verdadeiras e completas da empresa (CNPJ, razão social, endereço);</li>
									<li>Cada empresa contratante pode criar múltiplas contas de usuário para seus colaboradores;</li>
									<li>As credenciais de acesso são pessoais e intransferíveis;</li>
									<li>O administrador da conta empresarial é responsável pela gestão de permissões e acessos de sua equipe;</li>
									<li>É proibida a criação de contas com informações falsas ou fraudulentas.</li>
								</ul>
							</div>

							<div>
								<h3 className="text-xl font-semibold text-gray-800 mb-2">2.3. Responsabilidades do Cliente</h3>
								<p className="text-gray-700 leading-relaxed mb-2">Ao utilizar a plataforma, o cliente compromete-se a:</p>
								<ul className="list-disc list-inside text-gray-700 leading-relaxed space-y-2 ml-4">
									<li>Utilizar o serviço de forma legal, respeitando todas as leis e regulamentações aplicáveis;</li>
									<li>Obter consentimento adequado de seus clientes finais para coleta e uso de dados em campanhas de marketing;</li>
									<li>Não utilizar a plataforma para envio de spam ou comunicações não autorizadas;</li>
									<li>Respeitar as políticas de uso da WhatsApp Business API e regulamentações anti-spam (Lei 13.709/2018 - LGPD);</li>
									<li>Manter a segurança de suas credenciais de acesso;</li>
									<li>Informar imediatamente sobre qualquer uso não autorizado de sua conta;</li>
									<li>Garantir que os dados inseridos na plataforma são precisos e atualizados;</li>
									<li>Não tentar acessar áreas restritas da plataforma ou realizar engenharia reversa do software;</li>
									<li>Responsabilizar-se pelo conteúdo das mensagens enviadas através da plataforma.</li>
								</ul>
							</div>

							<div>
								<h3 className="text-xl font-semibold text-gray-800 mb-2">2.4. Disponibilidade e Suporte</h3>
								<p className="text-gray-700 leading-relaxed">
									Comprometemo-nos a manter a plataforma disponível 24/7, com disponibilidade mínima de 99,5% ao mês, excluindo-se períodos de manutenção
									programada. Manutenções serão comunicadas com antecedência mínima de 48 horas. O suporte técnico está disponível em horário comercial
									(segunda a sexta, das 9h às 18h) via e-mail e sistema de tickets.
								</p>
							</div>

							<div>
								<h3 className="text-xl font-semibold text-gray-800 mb-2">2.5. Propriedade Intelectual</h3>
								<p className="text-gray-700 leading-relaxed">
									Todos os direitos de propriedade intelectual relacionados à plataforma, incluindo software, código-fonte, interface, design, marcas,
									logotipos e metodologias, pertencem exclusivamente a RecompraCRM ou seus licenciadores. O cliente recebe apenas uma licença limitada, não
									exclusiva e intransferível para uso do serviço durante a vigência do contrato.
								</p>
							</div>

							<div>
								<h3 className="text-xl font-semibold text-gray-800 mb-2">2.6. Propriedade dos Dados</h3>
								<p className="text-gray-700 leading-relaxed">
									<strong>O cliente mantém total propriedade sobre seus dados e os dados de seus clientes finais.</strong> Atuamos como processadores de dados
									em nome do cliente. Os dashboards, relatórios e análises gerados a partir dos dados do cliente também pertencem ao cliente. Garantimos o
									direito de exportação completa dos dados a qualquer momento.
								</p>
							</div>

							<div>
								<h3 className="text-xl font-semibold text-gray-800 mb-2">2.7. Pagamento e Faturamento</h3>
								<ul className="list-disc list-inside text-gray-700 leading-relaxed space-y-2 ml-4">
									<li>Os planos de assinatura são cobrados mensalmente ou anualmente, conforme escolha do cliente;</li>
									<li>O pagamento deve ser realizado via boleto bancário, cartão de crédito ou transferência bancária;</li>
									<li>O não pagamento pode resultar em suspensão temporária do acesso;</li>
									<li>Reajustes de preços serão comunicados com 30 dias de antecedência;</li>
									<li>Custos adicionais podem ser aplicados para uso excedente de recursos (mensagens WhatsApp, armazenamento, etc.).</li>
								</ul>
							</div>

							<div>
								<h3 className="text-xl font-semibold text-gray-800 mb-2">2.8. Suspensão e Cancelamento</h3>
								<p className="text-gray-700 leading-relaxed mb-2">Reservamo-nos o direito de suspender ou cancelar a conta em casos de:</p>
								<ul className="list-disc list-inside text-gray-700 leading-relaxed space-y-2 ml-4">
									<li>Violação destes termos de uso;</li>
									<li>Inadimplência por período superior a 15 dias;</li>
									<li>Uso fraudulento ou abusivo da plataforma;</li>
									<li>Envio de spam ou violação de políticas da WhatsApp Business API;</li>
									<li>Atividades ilegais ou que prejudiquem terceiros.</li>
								</ul>
								<p className="text-gray-700 leading-relaxed mt-2">
									O cliente pode cancelar o serviço a qualquer momento, mediante aviso prévio de 30 dias. Após o cancelamento, os dados serão mantidos por 90
									dias para possível recuperação, e então permanentemente excluídos.
								</p>
							</div>

							<div>
								<h3 className="text-xl font-semibold text-gray-800 mb-2">2.9. Limitação de Responsabilidade</h3>
								<p className="text-gray-700 leading-relaxed">
									Não nos responsabilizamos por danos indiretos, lucros cessantes ou prejuízos decorrentes de: uso inadequado da plataforma pelo cliente,
									indisponibilidade de serviços de terceiros (WhatsApp, provedores de internet), falhas de infraestrutura fora de nosso controle, ou conteúdo
									de mensagens e campanhas criadas pelo cliente. Nossa responsabilidade está limitada ao valor pago pelo cliente nos últimos 12 meses.
								</p>
							</div>
						</div>
					</section>

					{/* Política de Privacidade */}
					<section>
						<h2 className="text-2xl font-bold text-gray-900 mb-4 border-t pt-6">3. Política de Privacidade</h2>

						<div className="space-y-4">
							<div>
								<h3 className="text-xl font-semibold text-gray-800 mb-2">3.1. Dados Coletados e Processados</h3>
								<p className="text-gray-700 leading-relaxed mb-2">Como plataforma B2B, processamos diferentes categorias de dados:</p>
								<ul className="list-disc list-inside text-gray-700 leading-relaxed space-y-2 ml-4">
									<li>
										<strong>Dados da Empresa Cliente:</strong> CNPJ, razão social, nome fantasia, endereço, telefone, e-mail corporativo, dados de faturamento;
									</li>
									<li>
										<strong>Dados dos Usuários (Colaboradores do Cliente):</strong> Nome, e-mail corporativo, cargo, telefone, credenciais de acesso, permissões
										e perfis de uso;
									</li>
									<li>
										<strong>Dados dos Clientes Finais (Clientes do Varejista):</strong> Nome, CPF/CNPJ, telefone, e-mail, histórico de compras, preferências,
										segmentação, dados de interação;
									</li>
									<li>
										<strong>Dados de Comunicação WhatsApp:</strong> Números de telefone, conteúdo de mensagens enviadas e recebidas, status de entrega e
										leitura, timestamps, mídia compartilhada;
									</li>
									<li>
										<strong>Dados Analíticos e de Negócio:</strong> Métricas de vendas, dados de produtos, estoque, transações, comportamento de compra,
										análises estatísticas;
									</li>
									<li>
										<strong>Dados de Uso da Plataforma:</strong> Logs de acesso, endereços IP, navegador, ações realizadas, funcionalidades utilizadas, tempo de
										uso;
									</li>
									<li>
										<strong>Dados Técnicos:</strong> Cookies de sessão, tokens de autenticação, preferências de configuração.
									</li>
								</ul>
							</div>

							<div>
								<h3 className="text-xl font-semibold text-gray-800 mb-2">3.2. Finalidade do Tratamento de Dados</h3>
								<p className="text-gray-700 leading-relaxed mb-2">Os dados são coletados e processados para:</p>
								<ul className="list-disc list-inside text-gray-700 leading-relaxed space-y-2 ml-4">
									<li>Fornecer os serviços contratados de BI, CRM e atendimento WhatsApp;</li>
									<li>Gerar dashboards, relatórios e análises de dados para o cliente;</li>
									<li>Executar campanhas de marketing automatizadas via WhatsApp em nome do cliente;</li>
									<li>Gerenciar atendimentos e conversas com clientes finais;</li>
									<li>Manter e melhorar a funcionalidade da plataforma;</li>
									<li>Realizar cobranças e gestão financeira;</li>
									<li>Prestar suporte técnico e atendimento ao cliente;</li>
									<li>Cumprir obrigações legais e regulatórias;</li>
									<li>Garantir segurança, prevenir fraudes e proteger direitos;</li>
									<li>Realizar análises estatísticas agregadas e anônimas para melhoria do serviço.</li>
								</ul>
							</div>

							<div>
								<h3 className="text-xl font-semibold text-gray-800 mb-2">3.3. Base Legal (LGPD)</h3>
								<p className="text-gray-700 leading-relaxed mb-2">
									O tratamento de dados está fundamentado nas seguintes bases legais da LGPD (Lei nº 13.709/2018):
								</p>
								<ul className="list-disc list-inside text-gray-700 leading-relaxed space-y-2 ml-4">
									<li>
										<strong>Execução de contrato (Art. 7º, V):</strong> Processamento necessário para prestação dos serviços contratados pelo cliente;
									</li>
									<li>
										<strong>Legítimo interesse (Art. 7º, IX):</strong> Para operação da plataforma, melhorias, segurança e prevenção de fraudes;
									</li>
									<li>
										<strong>Obrigação legal (Art. 7º, II):</strong> Cumprimento de obrigações fiscais, trabalhistas e regulatórias;
									</li>
									<li>
										<strong>Consentimento (Art. 7º, I):</strong> Quando aplicável, mediante autorização expressa do titular para finalidades específicas.
									</li>
								</ul>
							</div>

							<div>
								<h3 className="text-xl font-semibold text-gray-800 mb-2">3.4. Papel como Processador de Dados</h3>
								<p className="text-gray-700 leading-relaxed">
									<strong>Importante:</strong> Em relação aos dados dos clientes finais (consumidores do varejista), atuamos como{" "}
									<strong>operadores de dados</strong>, enquanto nosso cliente (empresa varejista) atua como <strong>controlador de dados</strong>. Isso
									significa que processamos esses dados exclusivamente conforme instruções do cliente e para as finalidades por ele determinadas. O cliente é
									responsável por garantir que possui base legal adequada para coleta e processamento dos dados de seus consumidores finais, incluindo
									consentimentos necessários para comunicações de marketing via WhatsApp.
								</p>
							</div>

							<div>
								<h3 className="text-xl font-semibold text-gray-800 mb-2">3.5. Compartilhamento de Dados</h3>
								<p className="text-gray-700 leading-relaxed mb-2">Compartilhamos dados com terceiros apenas quando necessário:</p>
								<ul className="list-disc list-inside text-gray-700 leading-relaxed space-y-2 ml-4">
									<li>
										<strong>Meta/WhatsApp:</strong> Para envio e recebimento de mensagens através da WhatsApp Business API;
									</li>
									<li>
										<strong>Provedores de Cloud:</strong> Para hospedagem e armazenamento de dados (AWS, Google Cloud, Azure);
									</li>
									<li>
										<strong>Processadores de Pagamento:</strong> Para gestão de cobranças e faturas;
									</li>
									<li>
										<strong>Ferramentas de Analytics:</strong> Para monitoramento de performance da plataforma (dados anonimizados);
									</li>
									<li>
										<strong>Prestadores de Suporte:</strong> Quando necessário para resolução de problemas técnicos;
									</li>
									<li>
										<strong>Autoridades Legais:</strong> Quando exigido por lei ou ordem judicial.
									</li>
								</ul>
								<p className="text-gray-700 leading-relaxed mt-2">
									<strong>Garantia:</strong> Todos os terceiros são cuidadosamente selecionados e vinculados a acordos de confidencialidade e proteção de
									dados. Nunca vendemos dados a terceiros ou os utilizamos para publicidade.
								</p>
							</div>

							<div>
								<h3 className="text-xl font-semibold text-gray-800 mb-2">3.6. Segurança da Informação</h3>
								<p className="text-gray-700 leading-relaxed mb-2">Implementamos rigorosas medidas de segurança para proteger os dados:</p>
								<ul className="list-disc list-inside text-gray-700 leading-relaxed space-y-2 ml-4">
									<li>
										<strong>Criptografia:</strong> SSL/TLS para dados em trânsito e criptografia AES-256 para dados em repouso;
									</li>
									<li>
										<strong>Controle de Acesso:</strong> Autenticação forte, permissões granulares baseadas em papéis (RBAC);
									</li>
									<li>
										<strong>Monitoramento:</strong> Logs detalhados de acesso e atividades, detecção de anomalias;
									</li>
									<li>
										<strong>Infraestrutura:</strong> Servidores em data centers certificados (ISO 27001, SOC 2);
									</li>
									<li>
										<strong>Backups:</strong> Backups automáticos diários com retenção de 30 dias, testes de recuperação regulares;
									</li>
									<li>
										<strong>Testes:</strong> Auditorias de segurança periódicas e testes de penetração;
									</li>
									<li>
										<strong>Políticas Internas:</strong> Treinamento contínuo da equipe em segurança e privacidade de dados;
									</li>
									<li>
										<strong>Plano de Resposta:</strong> Procedimentos estabelecidos para resposta a incidentes de segurança.
									</li>
								</ul>
							</div>

							<div>
								<h3 className="text-xl font-semibold text-gray-800 mb-2">3.7. Retenção de Dados</h3>
								<p className="text-gray-700 leading-relaxed mb-2">Os dados são retidos pelos seguintes períodos:</p>
								<ul className="list-disc list-inside text-gray-700 leading-relaxed space-y-2 ml-4">
									<li>
										<strong>Dados do cliente ativo:</strong> Durante toda a vigência do contrato de prestação de serviços;
									</li>
									<li>
										<strong>Após cancelamento:</strong> 90 dias para possibilidade de reativação, depois exclusão permanente;
									</li>
									<li>
										<strong>Dados fiscais e contábeis:</strong> 5 anos conforme legislação tributária brasileira;
									</li>
									<li>
										<strong>Mensagens WhatsApp:</strong> Conforme definido pelo cliente, com máximo de 2 anos;
									</li>
									<li>
										<strong>Logs de auditoria:</strong> 12 meses para fins de segurança;
									</li>
									<li>
										<strong>Dados analíticos agregados:</strong> Podem ser retidos indefinidamente se completamente anonimizados.
									</li>
								</ul>
								<p className="text-gray-700 leading-relaxed mt-2">
									O cliente pode solicitar exclusão antecipada de dados, respeitando-se apenas os prazos legais mínimos obrigatórios.
								</p>
							</div>

							<div>
								<h3 className="text-xl font-semibold text-gray-800 mb-2">3.8. Direitos dos Titulares de Dados</h3>
								<p className="text-gray-700 leading-relaxed mb-2">Conforme a LGPD, os titulares de dados (usuários e clientes finais) têm direito a:</p>
								<ul className="list-disc list-inside text-gray-700 leading-relaxed space-y-2 ml-4">
									<li>Confirmação da existência de tratamento de seus dados pessoais;</li>
									<li>Acesso aos dados pessoais armazenados;</li>
									<li>Correção de dados incompletos, inexatos ou desatualizados;</li>
									<li>Anonimização, bloqueio ou eliminação de dados desnecessários ou excessivos;</li>
									<li>Portabilidade dos dados a outro fornecedor de serviço;</li>
									<li>Eliminação dos dados tratados com consentimento;</li>
									<li>Informação sobre compartilhamento de dados com terceiros;</li>
									<li>Informação sobre a possibilidade de não fornecer consentimento;</li>
									<li>Revogação do consentimento quando aplicável.</li>
								</ul>
								<p className="text-gray-700 leading-relaxed mt-4">
									<strong>Para clientes finais (consumidores):</strong> Solicitações devem ser direcionadas ao varejista (nosso cliente), que as encaminhará
									para processamento.
								</p>
								<p className="text-gray-700 leading-relaxed mt-2">
									<strong>Para usuários da plataforma:</strong> Solicitações podem ser feitas diretamente ao nosso DPO através do e-mail:{" "}
									<strong>lucas@syncroniza.com.br</strong>
								</p>
								<p className="text-gray-700 leading-relaxed mt-2">Respondemos às solicitações em até 15 dias úteis.</p>
							</div>
						</div>
					</section>

					{/* Integração WhatsApp */}
					<section>
						<h2 className="text-2xl font-bold text-gray-900 mb-4 border-t pt-6">4. Integração com WhatsApp Business API</h2>
						<div className="space-y-4">
							<div>
								<h3 className="text-xl font-semibold text-gray-800 mb-2">4.1. Natureza da Integração</h3>
								<p className="text-gray-700 leading-relaxed">
									Nossa plataforma integra-se oficialmente com a WhatsApp Business API da Meta para permitir que empresas varejistas se comuniquem com seus
									clientes de forma profissional, escalável e automatizada. Esta integração possibilita o envio de campanhas de marketing, notificações
									transacionais e atendimento ao cliente via WhatsApp.
								</p>
							</div>

							<div>
								<h3 className="text-xl font-semibold text-gray-800 mb-2">4.2. Dados Processados via WhatsApp</h3>
								<p className="text-gray-700 leading-relaxed mb-2">Através da integração WhatsApp, processamos:</p>
								<ul className="list-disc list-inside text-gray-700 leading-relaxed space-y-2 ml-4">
									<li>Números de telefone de clientes finais (com código do país);</li>
									<li>Conteúdo de mensagens enviadas pelo varejista (texto, imagens, documentos, vídeos);</li>
									<li>Conteúdo de mensagens recebidas dos clientes finais;</li>
									<li>Status de entrega, leitura e resposta das mensagens;</li>
									<li>Timestamps de todas as interações;</li>
									<li>Metadados de conversação (ID da conversa, perfil do contato, etc.);</li>
									<li>Templates de mensagens aprovados pela Meta.</li>
								</ul>
							</div>

							<div>
								<h3 className="text-xl font-semibold text-gray-800 mb-2">4.3. Conformidade com Políticas da Meta</h3>
								<p className="text-gray-700 leading-relaxed mb-2">
									O uso da WhatsApp Business API está sujeito aos termos e políticas da Meta. Garantimos conformidade com:
								</p>
								<ul className="list-disc list-inside text-gray-700 leading-relaxed space-y-2 ml-4">
									<li>
										<strong>Políticas de Comércio e Negócios da Meta:</strong> Todas as comunicações devem seguir diretrizes de conteúdo;
									</li>
									<li>
										<strong>Opt-in Obrigatório:</strong> Mensagens de marketing só podem ser enviadas para usuários que deram consentimento prévio explícito;
									</li>
									<li>
										<strong>Janela de 24 horas:</strong> Mensagens promocionais só podem ser enviadas dentro de 24h após última interação do cliente;
									</li>
									<li>
										<strong>Templates Aprovados:</strong> Mensagens fora da janela de 24h devem usar templates pré-aprovados pela Meta;
									</li>
									<li>
										<strong>Opt-out Facilitado:</strong> Usuários devem poder facilmente cancelar o recebimento de mensagens;
									</li>
									<li>
										<strong>Qualidade de Mensagens:</strong> Monitoramento de métricas de qualidade para evitar bloqueios.
									</li>
								</ul>
							</div>

							<div>
								<h3 className="text-xl font-semibold text-gray-800 mb-2">4.4. Responsabilidades sobre Campanhas de Marketing</h3>
								<div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded">
									<p className="text-gray-700 leading-relaxed">
										<strong>Importante:</strong> O cliente (empresa varejista) é o único responsável por:
									</p>
									<ul className="list-disc list-inside text-gray-700 space-y-1 mt-2 ml-4">
										<li>Obter consentimento válido dos consumidores para envio de mensagens via WhatsApp;</li>
										<li>Garantir que possui base legal para tratamento dos dados de contato;</li>
										<li>Respeitar pedidos de cancelamento (opt-out) imediatamente;</li>
										<li>Criar conteúdo que respeite as políticas da Meta e legislação brasileira;</li>
										<li>Não enviar spam, conteúdo enganoso ou abusivo;</li>
										<li>Cumprir com a LGPD e Lei Anti-Spam na comunicação com consumidores.</li>
									</ul>
									<p className="text-gray-700 mt-2">
										Fornecemos as ferramentas, mas o cliente é responsável pelo uso adequado e legal das funcionalidades de marketing.
									</p>
								</div>
							</div>

							<div>
								<h3 className="text-xl font-semibold text-gray-800 mb-2">4.5. Compartilhamento de Dados com Meta</h3>
								<p className="text-gray-700 leading-relaxed">
									Ao utilizar a WhatsApp Business API, alguns dados são necessariamente compartilhados com a Meta (empresa controladora do WhatsApp) para
									viabilizar o serviço de mensagens. A Meta possui sua própria política de privacidade, disponível em whatsapp.com/legal. Nos certificamos de
									utilizar a API de forma que minimize o compartilhamento de dados, limitando-o ao estritamente necessário para operação do serviço.
								</p>
							</div>

							<div>
								<h3 className="text-xl font-semibold text-gray-800 mb-2">4.6. Restrições e Limitações</h3>
								<ul className="list-disc list-inside text-gray-700 leading-relaxed space-y-2 ml-4">
									<li>A Meta pode impor limites de mensagens com base no comportamento e qualidade;</li>
									<li>Violações das políticas podem resultar em suspensão temporária ou permanente do número WhatsApp;</li>
									<li>Não nos responsabilizamos por bloqueios ou restrições impostas pela Meta devido a uso inadequado pelo cliente;</li>
									<li>Tempos de entrega dependem da infraestrutura da Meta e podem variar;</li>
									<li>A disponibilidade do serviço WhatsApp está sujeita aos servidores e políticas da Meta.</li>
								</ul>
							</div>
						</div>
					</section>

					{/* DPA */}
					<section>
						<h2 className="text-2xl font-bold text-gray-900 mb-4 border-t pt-6">5. Acordo de Processamento de Dados (DPA)</h2>
						<div className="space-y-4">
							<div>
								<h3 className="text-xl font-semibold text-gray-800 mb-2">5.1. Relação Controlador-Operador</h3>
								<p className="text-gray-700 leading-relaxed">Para fins de conformidade com a LGPD, estabelecemos os seguintes papéis:</p>
								<ul className="list-disc list-inside text-gray-700 leading-relaxed space-y-2 ml-4">
									<li>
										<strong>Cliente (Controlador):</strong> A empresa varejista contratante é o controlador dos dados de seus clientes finais, determinando as
										finalidades e elementos essenciais do tratamento;
									</li>
									<li>
										<strong>Plataforma (Operador):</strong> Nossa plataforma atua como operadora, processando dados em nome do cliente e conforme suas
										instruções;
									</li>
									<li>
										<strong>Dados Próprios:</strong> Em relação aos dados cadastrais da empresa cliente e seus usuários, atuamos como controladores.
									</li>
								</ul>
							</div>

							<div>
								<h3 className="text-xl font-semibold text-gray-800 mb-2">5.2. Obrigações como Operador</h3>
								<p className="text-gray-700 leading-relaxed mb-2">Como operadores de dados, comprometemo-nos a:</p>
								<ul className="list-disc list-inside text-gray-700 leading-relaxed space-y-2 ml-4">
									<li>Processar dados exclusivamente conforme instruções documentadas do cliente;</li>
									<li>Garantir que pessoas autorizadas a processar dados estejam comprometidas com confidencialidade;</li>
									<li>Implementar medidas técnicas e organizacionais apropriadas de segurança;</li>
									<li>Assistir o cliente no cumprimento de obrigações relacionadas a exercício de direitos dos titulares;</li>
									<li>Auxiliar o cliente em garantir conformidade com obrigações de segurança, notificação de incidentes e avaliações de impacto;</li>
									<li>Excluir ou devolver todos os dados pessoais ao cliente após término do serviço;</li>
									<li>Disponibilizar informações necessárias para demonstrar conformidade com obrigações;</li>
									<li>Notificar imediatamente caso receba instrução que viole a LGPD.</li>
								</ul>
							</div>

							<div>
								<h3 className="text-xl font-semibold text-gray-800 mb-2">5.3. Responsabilidades do Cliente (Controlador)</h3>
								<p className="text-gray-700 leading-relaxed mb-2">O cliente, como controlador de dados, é responsável por:</p>
								<ul className="list-disc list-inside text-gray-700 leading-relaxed space-y-2 ml-4">
									<li>Garantir que possui base legal adequada para coleta e processamento dos dados;</li>
									<li>Obter consentimentos necessários de seus clientes finais;</li>
									<li>Fornecer informações de privacidade adequadas aos titulares dos dados;</li>
									<li>Responder a solicitações de exercício de direitos dos titulares;</li>
									<li>Realizar avaliações de impacto à proteção de dados quando necessário;</li>
									<li>Determinar finalidades e meios de tratamento dos dados;</li>
									<li>Garantir que dados fornecidos à plataforma são precisos e atualizados;</li>
									<li>Notificar a plataforma sobre quaisquer restrições de tratamento.</li>
								</ul>
							</div>

							<div>
								<h3 className="text-xl font-semibold text-gray-800 mb-2">5.4. Suboperadores</h3>
								<p className="text-gray-700 leading-relaxed mb-2">
									Podemos contratar suboperadores (subprocessadores) para auxiliar na prestação dos serviços. Suboperadores atuais incluem:
								</p>
								<ul className="list-disc list-inside text-gray-700 leading-relaxed space-y-2 ml-4">
									<li>Provedores de cloud (AWS, Google Cloud, Azure) - hospedagem e armazenamento;</li>
									<li>Meta/WhatsApp - serviço de mensagens;</li>
									<li>Processadores de pagamento - cobranças e faturas;</li>
									<li>Serviços de e-mail - comunicações transacionais.</li>
								</ul>
								<p className="text-gray-700 leading-relaxed mt-2">
									Todos os suboperadores são cuidadosamente avaliados e vinculados a obrigações de proteção de dados equivalentes. Notificaremos o cliente
									sobre mudanças na lista de suboperadores com antecedência de 30 dias.
								</p>
							</div>

							<div>
								<h3 className="text-xl font-semibold text-gray-800 mb-2">5.5. Incidentes de Segurança</h3>
								<p className="text-gray-700 leading-relaxed">
									Em caso de incidente de segurança que resulte em destruição, perda, alteração, divulgação não autorizada ou acesso a dados pessoais,
									notificaremos o cliente em até 72 horas após tomarmos conhecimento do incidente. A notificação incluirá natureza do incidente, dados
									afetados, possíveis consequências e medidas tomadas ou propostas para remediar.
								</p>
							</div>
						</div>
					</section>

					{/* Cookies */}
					<section>
						<h2 className="text-2xl font-bold text-gray-900 mb-4 border-t pt-6">6. Cookies e Tecnologias Similares</h2>
						<p className="text-gray-700 leading-relaxed mb-4">
							A plataforma utiliza cookies e tecnologias similares para garantir seu funcionamento adequado e melhorar a experiência do usuário.
						</p>
						<div className="space-y-4">
							<div>
								<h3 className="text-xl font-semibold text-gray-800 mb-2">6.1. Tipos de Cookies Utilizados</h3>
								<ul className="list-disc list-inside text-gray-700 leading-relaxed space-y-2 ml-4">
									<li>
										<strong>Cookies Essenciais:</strong> Necessários para autenticação, sessão do usuário e funcionalidades básicas da plataforma. Não podem ser
										desativados;
									</li>
									<li>
										<strong>Cookies de Preferência:</strong> Armazenam configurações escolhidas pelo usuário (tema, idioma, layout);
									</li>
									<li>
										<strong>Cookies de Performance:</strong> Coletam informações sobre uso da plataforma para melhorias (dados agregados e anônimos);
									</li>
									<li>
										<strong>Local Storage:</strong> Armazenamento local de dados temporários para melhor performance.
									</li>
								</ul>
								<p className="text-gray-700 leading-relaxed mt-2">
									<strong>Importante:</strong> Não utilizamos cookies de rastreamento de terceiros, cookies publicitários ou compartilhamento de dados com
									redes de anúncios.
								</p>
							</div>

							<div>
								<h3 className="text-xl font-semibold text-gray-800 mb-2">6.2. Gestão de Cookies</h3>
								<p className="text-gray-700 leading-relaxed">
									Você pode gerenciar cookies através das configurações do seu navegador. Note que a desativação de cookies essenciais impedirá o uso adequado
									da plataforma. Cookies de sessão são automaticamente excluídos ao fechar o navegador.
								</p>
							</div>
						</div>
					</section>

					{/* Transferência Internacional */}
					<section>
						<h2 className="text-2xl font-bold text-gray-900 mb-4 border-t pt-6">7. Transferência Internacional de Dados</h2>
						<p className="text-gray-700 leading-relaxed mb-4">
							Alguns dados podem ser armazenados e processados em servidores localizados fora do Brasil, especialmente através de provedores de cloud
							computing (AWS, Google Cloud, Azure) que operam data centers internacionais.
						</p>
						<p className="text-gray-700 leading-relaxed mb-4">
							<strong>Garantias de Proteção:</strong> Todas as transferências internacionais são realizadas com garantias adequadas de proteção conforme Art.
							33 da LGPD, incluindo:
						</p>
						<ul className="list-disc list-inside text-gray-700 leading-relaxed space-y-2 ml-4">
							<li>Países com nível adequado de proteção de dados ou cláusulas contratuais padrão;</li>
							<li>Certificações internacionais de segurança (ISO 27001, SOC 2);</li>
							<li>Criptografia de dados em trânsito e em repouso;</li>
							<li>Contratos com provedores que garantem proteção equivalente à LGPD;</li>
							<li>Possibilidade de escolha de região de armazenamento (quando tecnicamente viável).</li>
						</ul>
					</section>

					{/* Alterações */}
					<section>
						<h2 className="text-2xl font-bold text-gray-900 mb-4 border-t pt-6">8. Alterações nos Termos</h2>
						<p className="text-gray-700 leading-relaxed">
							Reservamo-nos o direito de modificar estes Termos de Uso e Política de Privacidade a qualquer momento para refletir mudanças em nossos
							serviços, práticas de dados, ou requisitos legais. As alterações entrarão em vigor imediatamente após sua publicação na plataforma.
						</p>
						<p className="text-gray-700 leading-relaxed mt-4">
							<strong>Notificação de Alterações:</strong> Mudanças substanciais serão comunicadas aos clientes com antecedência mínima de 30 dias via e-mail
							e notificação na plataforma. Recomendamos a revisão periódica deste documento. O uso continuado da plataforma após alterações constitui
							aceitação dos novos termos.
						</p>
					</section>

					{/* Legislação Aplicável */}
					<section>
						<h2 className="text-2xl font-bold text-gray-900 mb-4 border-t pt-6">9. Legislação Aplicável e Foro</h2>
						<p className="text-gray-700 leading-relaxed mb-4">Estes termos são regidos pela legislação brasileira, especialmente:</p>
						<ul className="list-disc list-inside text-gray-700 leading-relaxed space-y-2 ml-4">
							<li>
								<strong>Lei Geral de Proteção de Dados Pessoais (LGPD)</strong> - Lei nº 13.709/2018;
							</li>
							<li>
								<strong>Marco Civil da Internet</strong> - Lei nº 12.965/2014;
							</li>
							<li>
								<strong>Código de Defesa do Consumidor</strong> - Lei nº 8.078/1990;
							</li>
							<li>
								<strong>Código Civil Brasileiro</strong> - Lei nº 10.406/2002.
							</li>
						</ul>
						<p className="text-gray-700 leading-relaxed mt-4">
							Fica eleito o foro da comarca da sede do cliente para dirimir quaisquer controvérsias oriundas destes termos.
						</p>
					</section>

					{/* Contato */}
					<section>
						<h2 className="text-2xl font-bold text-gray-900 mb-4 border-t pt-6">10. Contato e Encarregado de Dados</h2>
						<div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
							<p className="text-gray-700 leading-relaxed mb-4">
								<strong>Encarregado de Proteção de Dados (DPO):</strong>
							</p>
							<ul className="text-gray-700 space-y-2">
								<li>
									<strong>E-mail:</strong> lucas@syncroniza.com.br
								</li>
								<li>
									<strong>Suporte Técnico:</strong> suporte@syncroniza.com.br
								</li>
							</ul>
							<p className="text-gray-700 leading-relaxed mt-4">
								<strong>Para o que entrar em contato:</strong>
							</p>
							<ul className="list-disc list-inside text-gray-700 space-y-1 mt-2 ml-4">
								<li>Exercício de direitos previstos na LGPD;</li>
								<li>Dúvidas sobre tratamento de dados pessoais;</li>
								<li>Solicitações de acesso, correção ou exclusão de dados;</li>
								<li>Reportar incidentes de segurança;</li>
								<li>Questões sobre privacidade e proteção de dados;</li>
								<li>Suporte técnico e dúvidas sobre a plataforma.</li>
							</ul>
							<p className="text-gray-700 leading-relaxed mt-4">
								<strong>Prazo de Resposta:</strong> Responderemos todas as solicitações em até 15 dias úteis. Para questões urgentes de segurança,
								priorizaremos resposta imediata.
							</p>
						</div>
					</section>

					{/* Aceitação */}
					<section className="border-t pt-6">
						<div className="bg-green-50 border-l-4 border-green-500 p-4 rounded">
							<p className="text-gray-700 leading-relaxed">
								<strong>Aceitação:</strong> Ao contratar e utilizar esta plataforma, você (representante da empresa contratante) declara ter lido,
								compreendido e concordado com os Termos de Uso e Política de Privacidade aqui estabelecidos, em nome da empresa que representa. O uso da
								plataforma está condicionado à aceitação integral destes termos.
							</p>
						</div>
					</section>
				</div>

				{/* Footer */}
				<footer className="mt-8 text-center text-sm text-gray-600 pb-8">
					<p>© {new Date().getFullYear()} RecompraCRM. Todos os direitos reservados.</p>
					<p className="mt-2">Plataforma B2B SaaS - Business Intelligence, CRM e Atendimento WhatsApp</p>
				</footer>
			</main>
		</div>
	);
}
